import {
  ProposalInput,
  ProposalData,
  SystemSpec,
  FinancialBreakdown,
  EnvironmentalImpact,
  ComponentBreakdown,
  DualProposal,
  TarifaParams,
  Tarifa1Params,
  TarifaDACParams,
  TarifaPDBTParams
} from './types';

const HSP = 5.5;
const PR = 0.835;
const PRICE_PER_WATT = 18.5;
const DISCOUNT_RATE = 0.10;
const IVA_RATE = 0.16;
const ANTICIPO_PERCENT = 0.50;

// Default values mirror the latest params used in the backend.
// They act as fallbacks for local calculations when we do not receive Airtable params.
const DEFAULT_TARIFA_1: Tarifa1Params = {
  buckets: [
    { limit: 75, price: 1.087 },
    { limit: 65, price: 1.320 },
    { limit: Infinity, price: 3.861 }
  ],
  minimo_mensual: 25,
  minimo_mensual_kwh: 25,
  basico: 1.087
};

const DEFAULT_TARIFA_DAC: TarifaDACParams = {
  fijo_mensual: 142.50,
  precio_kwh: 6.711,
  minimo_mensual: 142.50
};

const DEFAULT_TARIFA_PDBT: TarifaPDBTParams = {
  fijo_mensual: 44.88,
  precio_kwh: 3.975,
  minimo_mensual: 44.88
};

const DAC_THRESHOLD_BIMONTHLY = 500;

const PANEL_OPTIONS = [555, 600, 620, 650] as const;

function resolveTarifaParams(input: ProposalInput): TarifaParams {
  return {
    tarifa1: { ...DEFAULT_TARIFA_1, ...(input.tarifaParams?.tarifa1 || {}) },
    tarifaDAC: { ...DEFAULT_TARIFA_DAC, ...(input.tarifaParams?.tarifaDAC || {}) },
    tarifaPDBT: { ...DEFAULT_TARIFA_PDBT, ...(input.tarifaParams?.tarifaPDBT || {}) }
  };
}

export function getDefaultTarifaParams(): TarifaParams {
  return {
    tarifa1: { ...DEFAULT_TARIFA_1 },
    tarifaDAC: { ...DEFAULT_TARIFA_DAC },
    tarifaPDBT: { ...DEFAULT_TARIFA_PDBT }
  };
}

function calculateTarifa1Payment(kwhBimonthly: number, tarifa: Tarifa1Params): number {
  let remaining = kwhBimonthly;
  let total = 0;

  for (const bucket of tarifa.buckets) {
    const bucketBimonthly = bucket.limit * 2;
    if (remaining <= 0) break;

    if (remaining <= bucketBimonthly) {
      total += remaining * bucket.price;
      remaining = 0;
    } else {
      total += bucketBimonthly * bucket.price;
      remaining -= bucketBimonthly;
    }
  }

  const minBimonthly = tarifa.minimo_mensual * 2;
  return Math.max(total, minBimonthly) * (1 + IVA_RATE);
}

function calculateDACPayment(kwhBimonthly: number, tarifa: TarifaDACParams): number {
  const total = tarifa.fijo_mensual * 2 + kwhBimonthly * tarifa.precio_kwh;
  const minBimonthly = tarifa.minimo_mensual * 2;
  return Math.max(total, minBimonthly) * (1 + IVA_RATE);
}

function calculatePDBTPayment(kwhBimonthly: number, tarifa: TarifaPDBTParams): number {
  const total = tarifa.fijo_mensual * 2 + kwhBimonthly * tarifa.precio_kwh;
  const minBimonthly = tarifa.minimo_mensual * 2;
  return Math.max(total, minBimonthly) * (1 + IVA_RATE);
}

function estimateConsumptionKwh(input: ProposalInput, tarifas: TarifaParams): number {
  if (input.consumoKwh && input.consumoKwh > 0) return input.consumoKwh;

  const paymentBimonthly = input.periodo === 'bimestral' ? input.pagoActual : input.pagoActual * 2;

  if (input.tarifa === 'DAC') {
    const withoutIVA = paymentBimonthly / (1 + IVA_RATE);
    const kwh = (withoutIVA - tarifas.tarifaDAC.fijo_mensual * 2) / tarifas.tarifaDAC.precio_kwh;
    return Math.max(100, kwh);
  }

  if (input.tarifa === 'PDBT') {
    const withoutIVA = paymentBimonthly / (1 + IVA_RATE);
    const kwh = (withoutIVA - tarifas.tarifaPDBT.fijo_mensual * 2) / tarifas.tarifaPDBT.precio_kwh;
    return Math.max(100, kwh);
  }

  const withoutIVA = paymentBimonthly / (1 + IVA_RATE);
  let remaining = withoutIVA;
  let kwh = 0;

  for (const bucket of tarifas.tarifa1.buckets) {
    const bucketCost = bucket.limit * 2 * bucket.price;
    if (remaining <= 0) break;

    if (remaining <= bucketCost) {
      kwh += remaining / bucket.price;
      remaining = 0;
    } else {
      kwh += bucket.limit * 2;
      remaining -= bucketCost;
    }
  }

  return Math.max(100, kwh);
}

function addFutureLoads(baseKwh: number, cargas: ProposalInput['cargas']): number {
  let additionalKwh = 0;

  if (cargas?.ev) {
    const km = parseFloat(cargas.ev.km) || 50;
    const kwhPer100km = 18;
    const dailyKwh = (km / 100) * kwhPer100km;
    additionalKwh += dailyKwh * 60;
  }

  if (cargas?.minisplit) {
    const cantidad = parseFloat(cargas.minisplit.cantidad) || 1;
    const horas = parseFloat(cargas.minisplit.horas) || 6;
    const consumoPorUnidad = 1.5;
    const dailyKwh = cantidad * horas * consumoPorUnidad;
    additionalKwh += dailyKwh * 60;
  }

  if (cargas?.secadora) {
    const usosSemanales = 3;
    const kwhPorUso = 3;
    additionalKwh += (usosSemanales * kwhPorUso * 8);
  }

  if (cargas?.bomba) {
    const horasDiarias = 2;
    const kwhPorHora = 0.75;
    additionalKwh += horasDiarias * kwhPorHora * 60;
  }

  return baseKwh + additionalKwh;
}

function calculateSystemSize(consumoBimestralKwh: number): SystemSpec {
  const potenciaRequerida = consumoBimestralKwh / (HSP * 60 * PR);

  let bestConfig: SystemSpec | null = null;
  let bestDiff = Infinity;

  for (const potenciaPanel of PANEL_OPTIONS) {
    for (let numPaneles = 1; numPaneles <= 50; numPaneles++) {
      const potenciaTotal = numPaneles * potenciaPanel;
      const diff = Math.abs(potenciaTotal - potenciaRequerida);
      const diffPercent = diff / potenciaRequerida;

      if (diffPercent <= 0.05 && diff < bestDiff) {
        bestDiff = diff;
        const generacionMensualKwh = (potenciaTotal * HSP * 30 * PR) / 1000;
        const generacionAnualKwh = generacionMensualKwh * 12;

        if (numPaneles <= 12) {
          bestConfig = {
            numPaneles,
            potenciaPorPanel: potenciaPanel,
            potenciaTotal,
            generacionMensualKwh,
            generacionAnualKwh,
            microinversor: {
              marca: 'Hoymiles',
              modelo: numPaneles <= 8 ? 'HMS-800W' : 'HMS-1600W',
              cantidad: Math.ceil(numPaneles / 2),
              mppt: numPaneles <= 8 ? 2 : 4
            },
            montaje: {
              marca: 'Aluminext'
            }
          };
        } else {
          const potenciaInversor = Math.ceil(potenciaTotal / 1000) * 1000;
          bestConfig = {
            numPaneles,
            potenciaPorPanel: potenciaPanel,
            potenciaTotal,
            generacionMensualKwh,
            generacionAnualKwh,
            inversorString: {
              marca: 'Huawei',
              modelo: `SUN${potenciaInversor / 1000}K`,
              potencia: potenciaInversor
            },
            montaje: {
              marca: 'Aluminext'
            }
          };
        }
      }
    }
  }

  if (!bestConfig) {
    const numPaneles = 10;
    const potenciaPanel = 600;
    const potenciaTotal = numPaneles * potenciaPanel;
    const generacionMensualKwh = (potenciaTotal * HSP * 30 * PR) / 1000;
    const generacionAnualKwh = generacionMensualKwh * 12;

    bestConfig = {
      numPaneles,
      potenciaPorPanel: potenciaPanel,
      potenciaTotal,
      generacionMensualKwh,
      generacionAnualKwh,
      microinversor: {
        marca: 'Hoymiles',
        modelo: 'HMS-800W',
        cantidad: 5,
        mppt: 2
      },
      montaje: {
        marca: 'Aluminext'
      }
    };
  }

  return bestConfig;
}

export function computeFuturePayment(
  consumoBimestralKwh: number,
  generacionBimestralKwh: number,
  tarifa: string,
  tarifas: TarifaParams,
  hasDAP: boolean = false,
  dapAmount: number = 0
): number {
  const consumoResidual = Math.max(0, consumoBimestralKwh - generacionBimestralKwh);

  const isTarifa1 = ['1', '1A', '1B', '1C', '1D', '1E', '1F'].includes(tarifa);
  const minTarifa1KwhBimonthly = tarifas.tarifa1.minimo_mensual_kwh * 2;
  const minTarifa1PaymentBimonthly = minTarifa1KwhBimonthly * tarifas.tarifa1.basico * (1 + IVA_RATE);

  let pagoFuturo = 0;

  if ((isTarifa1 || tarifa === 'DAC') && consumoResidual <= minTarifa1KwhBimonthly) {
    pagoFuturo = minTarifa1PaymentBimonthly;
  } else if (tarifa === 'DAC') {
    if (consumoResidual === 0) {
      pagoFuturo = tarifas.tarifaDAC.minimo_mensual * 2 * (1 + IVA_RATE);
    } else {
      pagoFuturo = calculateDACPayment(consumoResidual, tarifas.tarifaDAC);
    }
  } else if (tarifa === 'PDBT') {
    if (consumoResidual <= 0) {
      pagoFuturo = tarifas.tarifaPDBT.fijo_mensual * 2 * (1 + IVA_RATE);
    } else {
      pagoFuturo = calculatePDBTPayment(consumoResidual, tarifas.tarifaPDBT);
    }
  } else {
    if (consumoResidual === 0) {
      pagoFuturo = tarifas.tarifa1.minimo_mensual * 2 * (1 + IVA_RATE);
    } else {
      pagoFuturo = calculateTarifa1Payment(consumoResidual, tarifas.tarifa1);
    }
  }

  if (hasDAP && dapAmount > 0) {
    pagoFuturo += dapAmount;
  }

  return pagoFuturo;
}

function calculateFinancials(
  pagoActual: number,
  consumoBimestralKwh: number,
  generacionBimestralKwh: number,
  tarifa: string,
  system: SystemSpec,
  tarifas: TarifaParams,
  hasDAP: boolean = false,
  dapAmount: number = 0
): FinancialBreakdown {
  const pagoFuturo = computeFuturePayment(
    consumoBimestralKwh,
    generacionBimestralKwh,
    tarifa,
    tarifas,
    hasDAP,
    dapAmount
  );

  const ahorroBimestral = Math.max(0, pagoActual - pagoFuturo);
  const precioLista = system.potenciaTotal * PRICE_PER_WATT;
  const descuento = precioLista * DISCOUNT_RATE;
  const subtotal = precioLista - descuento;
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;
  const anticipo = total * ANTICIPO_PERCENT;
  const pagoPostInterconexion = total - anticipo;
  const anosRetorno = ahorroBimestral > 100 ? Math.min(25, total / (ahorroBimestral * 6)) : 15;

  return {
    pagoAhora: pagoActual,
    pagoFuturo,
    ahorroBimestral,
    anosRetorno,
    precioLista,
    descuento,
    subtotal,
    iva,
    total,
    anticipo,
    pagoPostInterconexion
  };
}

function calculateEnvironmentalImpact(generacionAnualKwh: number): EnvironmentalImpact {
  const arboles = Math.max(1, Math.round((generacionAnualKwh / 1000) * 4.2));
  const barrilesPetroleo = Math.max(1, Math.round((generacionAnualKwh / 1600) * 0.6));
  const toneladasCO2 = Math.max(0.1, parseFloat(((generacionAnualKwh / 1000) * 0.6).toFixed(1)));

  return {
    arboles,
    barrilesPetroleo,
    toneladasCO2
  };
}

function generateComponents(system: SystemSpec): ComponentBreakdown[] {
  const components: ComponentBreakdown[] = [
    {
      concepto: 'Paneles solares',
      cantidad: system.numPaneles,
      marca: 'Marca Tier 1',
      modelo: `${system.potenciaPorPanel}W`
    },
    {
      concepto: 'Estructura de montaje',
      cantidad: 1,
      marca: system.montaje.marca,
      modelo: 'Sistema completo'
    }
  ];

  if (system.microinversor) {
    components.push({
      concepto: 'Microinversores',
      cantidad: system.microinversor.cantidad,
      marca: system.microinversor.marca,
      modelo: system.microinversor.modelo
    });
  }

  if (system.inversorString) {
    components.push({
      concepto: 'Inversor string',
      cantidad: 1,
      marca: system.inversorString.marca,
      modelo: system.inversorString.modelo
    });
  }

  components.push(
    {
      concepto: 'Cableado y protecciones',
      cantidad: 1,
      marca: 'Varios',
      modelo: 'Sistema completo'
    },
    {
      concepto: 'Instalación y trámites CFE',
      cantidad: 1,
      marca: 'SolarYa',
      modelo: 'Servicio completo'
    }
  );

  return components;
}

export function generateProposal(input: ProposalInput): DualProposal {
  const tarifas = resolveTarifaParams(input);
  const consumoBimestralKwh = Math.max(100, estimateConsumptionKwh(input, tarifas));
  const pagoActualBimonthly = Math.max(100, input.periodo === 'bimestral' ? input.pagoActual : input.pagoActual * 2);

  const system = calculateSystemSize(consumoBimestralKwh);
  const generacionBimestralKwh = system.generacionMensualKwh * 2;
  const porcentajeCobertura = consumoBimestralKwh > 0 ? Math.min(100, (generacionBimestralKwh / consumoBimestralKwh) * 100) : 85;

  const financial = calculateFinancials(
    pagoActualBimonthly,
    consumoBimestralKwh,
    generacionBimestralKwh,
    input.tarifa,
    system,
    tarifas,
    input.hasDAP,
    input.dapAmount
  );

  const environmental = calculateEnvironmentalImpact(system.generacionAnualKwh);
  const components = generateComponents(system);

  const is1XTariff = ['1', '1A', '1B', '1C', '1D', '1E', '1F'].includes(input.tarifa);
  const showDACWarning = is1XTariff && consumoBimestralKwh >= DAC_THRESHOLD_BIMONTHLY;
  let dacFinancial: FinancialBreakdown | undefined;
  let dacBimonthlyPayment: number | undefined;

  if (showDACWarning) {
    dacBimonthlyPayment = calculateDACPayment(consumoBimestralKwh, tarifas.tarifaDAC);
    dacFinancial = calculateFinancials(
      dacBimonthlyPayment,
      consumoBimestralKwh,
      generacionBimestralKwh,
      'DAC',
      system,
      tarifas,
      input.hasDAP,
      input.dapAmount
    );
  }

  const currentProposal: ProposalData = {
    input,
    system,
    financial,
    environmental,
    components,
    porcentajeCobertura,
    showDACWarning,
    dacBimonthlyPayment,
    dacFinancial
  };

  const hasCargas = input.cargas && (
    input.cargas.ev || input.cargas.minisplit || input.cargas.secadora || input.cargas.bomba
  );

  if (hasCargas) {
    const futureConsumoBimestralKwh = addFutureLoads(consumoBimestralKwh, input.cargas);
    const futureSystem = calculateSystemSize(futureConsumoBimestralKwh);
    const futureGeneracionBimestralKwh = futureSystem.generacionMensualKwh * 2;
    const futurePorcentajeCobertura = futureConsumoBimestralKwh > 0 ? Math.min(100, (futureGeneracionBimestralKwh / futureConsumoBimestralKwh) * 100) : 85;

    let futurePagoActual = pagoActualBimonthly;
    if (input.tarifa === 'DAC') {
      futurePagoActual = calculateDACPayment(futureConsumoBimestralKwh, tarifas.tarifaDAC);
    } else if (input.tarifa === 'PDBT') {
      futurePagoActual = calculatePDBTPayment(futureConsumoBimestralKwh, tarifas.tarifaPDBT);
    } else {
      futurePagoActual = calculateTarifa1Payment(futureConsumoBimestralKwh, tarifas.tarifa1);
      if (input.hasDAP && input.dapAmount) {
        futurePagoActual += input.dapAmount;
      }
    }

    const futureFinancial = calculateFinancials(
      futurePagoActual,
      futureConsumoBimestralKwh,
      futureGeneracionBimestralKwh,
      input.tarifa,
      futureSystem,
      tarifas,
      input.hasDAP,
      input.dapAmount
    );

    const futureEnvironmental = calculateEnvironmentalImpact(futureSystem.generacionAnualKwh);
    const futureComponents = generateComponents(futureSystem);

    const futureShowDACWarning = is1XTariff && futureConsumoBimestralKwh >= DAC_THRESHOLD_BIMONTHLY;
    let futureDacFinancial: FinancialBreakdown | undefined;
    let futureDacBimonthlyPayment: number | undefined;

    if (futureShowDACWarning) {
      futureDacBimonthlyPayment = calculateDACPayment(futureConsumoBimestralKwh, tarifas.tarifaDAC);
      futureDacFinancial = calculateFinancials(
        futureDacBimonthlyPayment,
        futureConsumoBimestralKwh,
        futureGeneracionBimestralKwh,
        'DAC',
        futureSystem,
        tarifas,
        input.hasDAP,
        input.dapAmount
      );
    }

    const futureProposal: ProposalData = {
      input: { ...input, consumoKwh: futureConsumoBimestralKwh },
      system: futureSystem,
      financial: futureFinancial,
      environmental: futureEnvironmental,
      components: futureComponents,
      porcentajeCobertura: futurePorcentajeCobertura,
      showDACWarning: futureShowDACWarning,
      dacBimonthlyPayment: futureDacBimonthlyPayment,
      dacFinancial: futureDacFinancial
    };

    return { current: currentProposal, future: futureProposal };
  }

  return { current: currentProposal };
}
