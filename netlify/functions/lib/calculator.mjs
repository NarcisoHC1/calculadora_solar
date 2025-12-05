// netlify/functions/lib/calculator.mjs
// Cálculos básicos de propuesta (ITERACIÓN 1 - Simplificado)

const HSP = 5.5;
const PR = 0.835;
const PRICE_PER_W = 18.5;
const DISCOUNT_RATE = 0.10;
const IVA = 0.16;
const TC = 19.5;

const PANEL_WATTS = [555, 600, 620, 650];

export function calculateSystemSize(kwhBimestral) {
  const kwhMensual = kwhBimestral / 2;
  const potenciaRequeridaW = (kwhMensual / (HSP * 30 * PR)) * 1000;

  let bestConfig = null;
  let bestError = Infinity;

  for (const panelW of PANEL_WATTS) {
    const numPaneles = Math.ceil(potenciaRequeridaW / panelW);
    const potenciaTotal = numPaneles * panelW;
    const error = Math.abs(potenciaTotal - potenciaRequeridaW);

    if (error < bestError) {
      bestError = error;
      bestConfig = {
        potencia_panel: panelW,
        cantidad_paneles: numPaneles,
        potencia_total_w: potenciaTotal,
        kwp: (potenciaTotal / 1000).toFixed(2)
      };
    }
  }

  return bestConfig;
}

export function calculateArea(cantidadPaneles) {
  const areaPorPanel = 2.2;
  const multiplicador = 1.3;
  return Math.round(cantidadPaneles * areaPorPanel * multiplicador);
}

export function determineMicroCentral(cantidadPaneles) {
  return cantidadPaneles >= 15 ? "central" : "micro";
}

export function calculatePricing(potenciaTotalW) {
  const precioLista = potenciaTotalW * PRICE_PER_W;
  const descuento = precioLista * DISCOUNT_RATE;
  const subtotal = precioLista - descuento;
  const iva = subtotal * IVA;
  const total = subtotal + iva;

  return {
    tc: TC,
    profit_margin: 0.25,
    discount_rate: DISCOUNT_RATE,
    precio_lista: precioLista,
    subtotal,
    iva,
    total
  };
}

export function estimateKwhFromPayment(pagoMXN, periodicidad, tarifa) {
  const pagoBimestral = periodicidad === "mensual" ? pagoMXN * 2 : pagoMXN;
  let precioPromedioPorKwh;

  switch (tarifa.toUpperCase()) {
    case "DAC":
      precioPromedioPorKwh = 8.0;
      break;
    case "PDBT":
    case "GDBT":
    case "GDMTH":
    case "GDMTO":
      precioPromedioPorKwh = 5.0;
      break;
    default:
      precioPromedioPorKwh = 3.0;
      break;
  }

  const pagoBimestralSinIVA = pagoBimestral / 1.16;
  const kwhBimestral = pagoBimestralSinIVA / precioPromedioPorKwh;
  return Math.max(100, Math.round(kwhBimestral));
}

export function calculateExtraLoads(cargas, periodicidad) {
  let extraKwh = 0;
  const dias = periodicidad === "bimestral" ? 60 : 30;

  if (cargas.ev && cargas.ev.km) {
    const kmDiarios = Number(cargas.ev.km) || 0;
    const kwhPor100km = 18;
    extraKwh += (kmDiarios / 100) * kwhPor100km * dias;
  }

  if (cargas.minisplit && cargas.minisplit.cantidad && cargas.minisplit.horas) {
    const cantidad = Number(cargas.minisplit.cantidad) || 0;
    const horas = Number(cargas.minisplit.horas) || 0;
    const kwhPorHora = 1.5;
    extraKwh += cantidad * horas * kwhPorHora * dias;
  }

  if (cargas.secadora && cargas.secadora.horas) {
    const horasSemanales = Number(cargas.secadora.horas) || 0;
    const semanas = periodicidad === "bimestral" ? 8 : 4;
    const kwhPorHora = 2.5;
    extraKwh += horasSemanales * kwhPorHora * semanas;
  }

  if (cargas.bomba) {
    const kwhDiario = 1.5;
    extraKwh += kwhDiario * dias;
  }

  if (cargas.otro) {
    const kwhDiario = 2.0;
    extraKwh += kwhDiario * dias;
  }

  return Math.round(extraKwh);
}

function normalizeTipoInmueble(tipoInmueble) {
  const raw = (tipoInmueble || "").toString().trim();
  if (!raw) return "";

  const byLabel = {
    "casa o negocio independiente de 1-2 pisos": "1",
    "departamento/local en edificio / condominio vertical": "2",
    "solo areas comunes de condominio / fraccionamiento": "3",
    "sólo areas comunes de condominio / fraccionamiento": "3",
    "sólo áreas comunes de condominio / fraccionamiento": "3",
    "solo areas comunes de edificio vertical": "9",
    "sólo areas comunes de edificio vertical": "9",
    "sólo áreas comunes de edificio vertical": "9",
    "local en plaza comercial o edificio": "4",
    "conjunto habitacional vertical / condominio vertical": "5",
    "conjunto habitacional horizontal / condominio horizontal": "6",
    "nave industrial / bodega": "7",
    "edificios enteros (hoteles, oficinas, publicos)": "8",
    "edificios enteros (hoteles, oficinas, públicos)": "8"
  };

  const lower = raw.toLowerCase();
  if (byLabel[lower]) return byLabel[lower];
  return raw;
}

export function calculateMetrosDistancia(tipoInmueble, pisos, distanciaReportada) {
  const metersPerFloor = 3.0;
  const tipo = normalizeTipoInmueble(tipoInmueble);

  if (tipo === "1") return 30;
  if (["2", "4", "5", "8", "9"].includes(tipo)) {
    return 30 + (Number(pisos) || 0) * metersPerFloor;
  }
  if (["3", "6", "7"].includes(tipo)) {
    return Math.max(30, Number(distanciaReportada) || 0);
  }
  return 30;
}

export function generateProposal(formData) {
  let kwhConsumidos;
  if (formData.kwh_consumidos) {
    kwhConsumidos = formData.kwh_consumidos;
  } else {
    kwhConsumidos = estimateKwhFromPayment(
      formData.pago_promedio,
      formData.periodicidad,
      formData.tarifa
    );
  }

  const extraKwh = calculateExtraLoads(formData.cargas || {}, formData.periodicidad);
  const kwhConCargasExtra = kwhConsumidos + extraKwh;
  const metrosDistancia = calculateMetrosDistancia(
    formData.tipo_inmueble,
    formData.pisos,
    formData.distancia_techo_tablero
  );

  const system = calculateSystemSize(kwhConsumidos);
  const area = calculateArea(system.cantidad_paneles);
  const microCentral = determineMicroCentral(system.cantidad_paneles);
  const pricing = calculatePricing(system.potencia_total_w);

  return {
    kwh_consumidos: kwhConsumidos,
    kwh_consumidos_y_cargas_extra: kwhConCargasExtra,
    metros_distancia: metrosDistancia,
    ...system,
    area_needed: area,
    micro_central: microCentral,
    ...pricing
  };
}
