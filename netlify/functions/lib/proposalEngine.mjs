// netlify/functions/lib/proposalEngine.mjs
// Main proposal generation engine

import { getParams, getHSPForMunicipio } from './params.mjs';
import {
  calculateKwhFromPaymentTarifa1,
  calculateKwhFromPaymentPDBT,
  calculateKwhFromPaymentDAC,
  calculatePaymentFromKwhTarifa1,
  calculatePaymentFromKwhPDBT,
  calculatePaymentFromKwhDAC,
  calculateExtraLoads,
  calculateMetrosDistancia,
  findOptimalPanelConfig,
  calculateMicroinverters,
  calculateMicroCosts,
  selectCentralInverter,
  calculateDACHypothetical,
  calculatePostSolarPayment,
  buildMontajeCombination,
  calculateEnvironmentalImpact
} from './calculations.mjs';

const IVA = 1.16;

export async function generateCompleteProposal(formData) {
  const params = await getParams();
  const limiteDACMensual = params.tarifaDAC?.Limite_Mensual_kWh ?? null;

  // 0. Validar ubicación
  const allowedStates = ["Ciudad de México", "Estado de México"];
  const normalizedEstado = (formData.estado || "").trim().toLowerCase();
  const estadoValido = allowedStates.some(s => s.toLowerCase() === normalizedEstado);

  let periodicidad = formData.periodicidad || "bimestral";
  let factorP = periodicidad === "mensual" ? 1 : 2;

  // 1. Determinar escenario
  const hasContrato = formData.has_cfe === true;
  const tieneRecibo = formData.tiene_recibo === true;
  const tarifaKnown = formData.tarifa && formData.tarifa !== "no conoce";
  const pagoPromedioInput = Number(formData.pago_promedio || 0);
  const kwhInput = formData.kwh_consumidos && formData.kwh_consumidos > 0 ? Number(formData.kwh_consumidos) : null;
  const plansCFE = formData.plans_cfe === true || formData.plans_cfe === "si" || formData.plans_cfe === "aislado";

  // Si la ubicación no es válida, marcar tarifa provincia y detener cálculos pesados
  if (!estadoValido) {
    return {
      tarifa: "provincia",
      kwh_consumidos: null,
      pago_promedio: pagoPromedioInput || null,
      kwh_consumidos_y_cargas_extra: null,
      metros_distancia: null,
      pago_hipotetico_cargas_extra: null,
      pago_dac_hipotetico_consumo_actual: null,
      pago_dac_hipotetico_cargas_extra: null,
      limite_dac_mensual_kwh: limiteDACMensual,
      propuesta_actual: null,
      propuesta_cargas_extra: null,
      frontend_outputs: null
    };
  }

  const deduceTarifaByUso = () => {
    if (formData.uso === "Negocio" || formData.casa_negocio === "Negocio") return "PDBT";
    return "1";
  };

  let tarifaFinal = formData.tarifa || "";
  let kwhConsumidos = 0;
  let pagoPromedio = pagoPromedioInput;

  // Escenario 1: Tiene contrato, tiene recibo, no conoce tarifa
  if (hasContrato && tieneRecibo && !tarifaKnown) {
    periodicidad = "bimestral";
    factorP = 2;
    tarifaFinal = deduceTarifaByUso();
    kwhConsumidos = calculateKwhFromPayment(pagoPromedio, tarifaFinal, factorP, params);
  } else if ((hasContrato && !tieneRecibo && !tarifaKnown) || (!hasContrato && plansCFE)) {
    // Escenarios 2 y 3: sin recibo o sin contrato pero quiere uno
    periodicidad = "bimestral";
    factorP = 2;
    tarifaFinal = deduceTarifaByUso();
    const estimation = estimateFromGuess(formData, tarifaFinal, factorP, params);
    kwhConsumidos = estimation.kwh;
    pagoPromedio = estimation.pago;
  } else {
    // Escenario 4: manual/OCR con tarifa conocida o deducida
    periodicidad = formData.periodicidad || "bimestral";
    factorP = periodicidad === "mensual" ? 1 : 2;

    if (!tarifaFinal || tarifaFinal === "no conoce") {
      tarifaFinal = deduceTarifaByUso();
    }

    if (kwhInput) {
      kwhConsumidos = kwhInput;
      if (!pagoPromedio) {
        pagoPromedio = calculatePaymentFromKwh(kwhConsumidos, tarifaFinal, factorP, params);
      }
    } else if (pagoPromedio && pagoPromedio > 0) {
      kwhConsumidos = calculateKwhFromPayment(pagoPromedio, tarifaFinal, factorP, params);
    } else {
      const estimation = estimateFromGuess(formData, tarifaFinal, factorP, params);
      kwhConsumidos = estimation.kwh;
      pagoPromedio = estimation.pago;
    }
  }

  // Fallback por si el pago o consumo calculado es cero o inválido
  if (!kwhConsumidos || kwhConsumidos <= 0) {
    const estimation = estimateFromGuess(formData, tarifaFinal, factorP, params);
    kwhConsumidos = estimation.kwh;
    if (!pagoPromedio || pagoPromedio <= 0) {
      pagoPromedio = estimation.pago;
    }
  }

  // 3. Calcular cargas extra
  const extraKwh = calculateExtraLoads(formData.loads, periodicidad, params);
  const kwhConCargasExtra = kwhConsumidos + extraKwh;

  // 4. Calcular metros distancia
  const metrosDistancia = calculateMetrosDistancia(
    formData.tipo_inmueble,
    formData.pisos,
    formData.distancia_techo_tablero,
    params
  );

  // 5. Obtener HSP (ahora por Estado, no municipio)
  const hsp = getHSPForMunicipio(formData.estado || "Ciudad de México", params);

  // 6. Generar propuesta para consumo actual
  const propuestaActual = await generateSystemProposal(
    kwhConsumidos,
    periodicidad,
    hsp,
    metrosDistancia,
    params
  );

  // 7. Generar propuesta con cargas extra (si aplica)
  let propuestaCargasExtra = null;
  if (extraKwh > 0) {
    propuestaCargasExtra = await generateSystemProposal(
      kwhConCargasExtra,
      periodicidad,
      hsp,
      metrosDistancia,
      params
    );
  }

  // 8. Calcular pagos hipotéticos
  const pagoHipoteticoCargasExtra = extraKwh > 0
    ? calculateHypotheticalPayment(kwhConCargasExtra, tarifaFinal, factorP, params)
    : null;

  const pagoDACActual = calculateDACHypothetical(kwhConsumidos, periodicidad, tarifaFinal, params);
  const pagoDACCargasExtra = extraKwh > 0
    ? calculateDACHypothetical(kwhConCargasExtra, periodicidad, tarifaFinal, params)
    : null;

  const frontendOutputs = buildFrontendOutputs({
    periodicidad,
    tarifa: tarifaFinal,
    pagoActual: pagoPromedio,
    pagoActualCargasExtra: pagoHipoteticoCargasExtra || pagoPromedio,
    kwhConsumidos,
    kwhConsumidosCargasExtra: kwhConCargasExtra,
    propuestaActual,
    propuestaCargasExtra,
    hsp,
    params,
    pagoDACActual,
    pagoDACCargasExtra
  });

  return {
    tarifa: tarifaFinal,
    limite_dac_mensual_kwh: limiteDACMensual,
    periodicidad,
    kwh_consumidos: kwhConsumidos != null ? Math.round(kwhConsumidos) : null,
    pago_promedio: pagoPromedio != null ? Math.round(pagoPromedio) : null,
    kwh_consumidos_y_cargas_extra: kwhConCargasExtra != null ? Math.round(kwhConCargasExtra) : null,
    metros_distancia: metrosDistancia,
    pago_hipotetico_cargas_extra: pagoHipoteticoCargasExtra,
    pago_dac_hipotetico_consumo_actual: pagoDACActual,
    pago_dac_hipotetico_cargas_extra: pagoDACCargasExtra,
    propuesta_actual: propuestaActual,
    propuesta_cargas_extra: propuestaCargasExtra,
    frontend_outputs: frontendOutputs
  };
}

function guessTarifa(formData, params, factorP) {
  // Si es negocio, probablemente PDBT
  if (formData.uso === "Negocio" || formData.casa_negocio === "Negocio") {
    return "PDBT";
  }

  // Si tenemos consumo conocido, verificar si supera el límite DAC mensual
  const dacLimit = params.tarifaDAC?.Limite_Mensual_kWh || Infinity;
  const consumoMensual = formData.kwh_consumidos
    ? (factorP === 1 ? formData.kwh_consumidos : formData.kwh_consumidos / 2)
    : null;

  if (consumoMensual && consumoMensual > dacLimit) {
    return "DAC";
  }

  // Si tenemos pago aproximado, inferir consumo y comparar con DAC
  if (formData.pago_promedio && formData.pago_promedio > 0) {
    const estimadoKwh = calculateKwhFromPaymentTarifa1(formData.pago_promedio, factorP, params);
    const estimadoMensual = estimadoKwh / factorP;
    if (estimadoMensual > dacLimit) {
      return "DAC";
    }
  }

  // Si es casa y no hay más información, tarifa 1 por defecto
  return "1";
}

function calculateKwhFromPayment(pago, tarifa, factorP, params) {
  const tarifaUpper = (tarifa || "1").toUpperCase();

  if (tarifaUpper === "1" || tarifaUpper.startsWith("1")) {
    return calculateKwhFromPaymentTarifa1(pago, factorP, params);
  } else if (tarifaUpper === "PDBT") {
    return calculateKwhFromPaymentPDBT(pago, factorP, params);
  } else if (tarifaUpper === "DAC") {
    return calculateKwhFromPaymentDAC(pago, factorP, params);
  }

  return calculateKwhFromPaymentTarifa1(pago, factorP, params);
}

function calculatePaymentFromKwh(kwh, tarifa, factorP, params) {
  const tarifaUpper = (tarifa || "1").toUpperCase();

  if (tarifaUpper === "1" || tarifaUpper.startsWith("1")) {
    return calculatePaymentFromKwhTarifa1(kwh, factorP, params);
  } else if (tarifaUpper === "PDBT") {
    return calculatePaymentFromKwhPDBT(kwh, factorP, params);
  } else if (tarifaUpper === "DAC") {
    return calculatePaymentFromKwhDAC(kwh, factorP, params);
  }

  return calculatePaymentFromKwhTarifa1(kwh, factorP, params);
}

function estimateFromGuess(formData, tarifa, factorP, params) {
  let kwhBimestral = 300;

  const isCasa = formData.rango_personas_negocio
    ? false
    : (formData.uso === "Casa" || formData.casa_negocio === "Casa" || (!formData.uso && !formData.casa_negocio));

  if (isCasa) {
    const membersRaw = formData.numero_personas !== undefined && formData.numero_personas !== null
      ? String(formData.numero_personas).trim()
      : "";

    const guess = params.houseLoadsGuess.find(h => String(h.Members).trim() === membersRaw)
      || params.houseLoadsGuess.find(h => Number(h.Members) === Number(membersRaw));

    const members = Number(membersRaw) || 2;
    kwhBimestral = guess?.kWh_Bimestre || 300;
  } else {
    const range = formData.rango_personas_negocio || "1-5";
    const guess = findBestBusinessGuess(range, params.businessLoadsGuess);
    kwhBimestral = guess?.kWh_Bimestre || 500;
  }

  // Adjust to periodicidad
  const kwh = factorP === 1 ? kwhBimestral / 2 : kwhBimestral;

  // Calculate payment based on tarifa
  const pago = calculatePaymentFromKwh(kwh, tarifa, factorP, params);

  return { kwh, pago };
}

function calculateHypotheticalPayment(kwh, tarifa, factorP, params) {
  const tarifaUpper = (tarifa || "1").toUpperCase();

  if (tarifaUpper === "1" || tarifaUpper.startsWith("1")) {
    return calculatePaymentFromKwhTarifa1(kwh, factorP, params);
  } else if (tarifaUpper === "PDBT") {
    return calculatePaymentFromKwhPDBT(kwh, factorP, params);
  } else if (tarifaUpper === "DAC") {
    return calculatePaymentFromKwhDAC(kwh, factorP, params);
  }

  return calculatePaymentFromKwhTarifa1(kwh, factorP, params);
}

function findBestBusinessGuess(selectedRange, businessGuesses = []) {
  const normalizeRange = (rangeStr = "") => {
    const [minStr, maxStr] = rangeStr.split("-");
    const min = Number(minStr.replace(/[^0-9]/g, "")) || 0;
    const max = maxStr ? Number(maxStr.replace(/[^0-9]/g, "")) || Infinity : (rangeStr.includes("+") ? Infinity : min);
    return { min, max, raw: rangeStr };
  };

  const desired = normalizeRange(selectedRange);
  const parsedGuesses = businessGuesses.map(g => ({ ...normalizeRange(g.Range), guess: g }));

  // Try exact match first
  const exact = parsedGuesses.find(g => g.raw === selectedRange);
  if (exact) return exact.guess;

  // Then try overlap based on min boundary falling inside a guess bucket
  const overlap = parsedGuesses.find(g => desired.min >= g.min && desired.min <= g.max);
  if (overlap) return overlap.guess;

  // Fallback to first available guess
  return businessGuesses[0];
}

async function generateSystemProposal(kwhTarget, periodicidad, hsp, metrosDistancia, params) {
  const pr = params.pr;
  const tc = params.commercialConditions.MXN_USD;

  // 1. Optimizar configuración de paneles
  const panelConfig = findOptimalPanelConfig(kwhTarget, periodicidad, hsp, pr, params);

  if (!panelConfig) {
    throw new Error("No se pudo encontrar configuración óptima de paneles");
  }

  const potenciaPanel = panelConfig.potenciaPanel;
  const cantidadPaneles = panelConfig.cantidadPaneles;
  const idPanel = panelConfig.panelId;
  const panel = panelConfig.panel;

  // 2. Calcular área requerida
  const areaNeeded = Math.round(
    cantidadPaneles * panel.Measurements_M2 * params.spaceMultiplier
  );

  // 3. Calcular costo de paneles
  const costoPaneles = cantidadPaneles * potenciaPanel * panel.Price_USD_W * tc;

  // 4. Determinar micro vs central
  const microCentral = cantidadPaneles >= 15 ? "central" : "micro";

  let idInversor = null;
  let costoInversor = 0;
  let idMicro2Panel = null;
  let cantidadMicro2Panel = 0;
  let idMicro4Panel = null;
  let cantidadMicro4Panel = 0;
  let costoMicroinversores = 0;
  let costoExtrasMicroinversores = 0;
  let inverterSpec = null;
  let micro2Spec = null;
  let micro4Spec = null;

  if (microCentral === "central") {
    // Sistema con inversor central
    const inverter = selectCentralInverter(cantidadPaneles, potenciaPanel, params);
    if (inverter) {
      idInversor = inverter.ID;
      costoInversor = inverter.Price_USD * tc;
      inverterSpec = inverter;
    }
  } else {
    // Sistema con microinversores
    const microConfig = calculateMicroinverters(cantidadPaneles, params);
    idMicro2Panel = microConfig.idMicro2Panel;
    cantidadMicro2Panel = microConfig.cantidadMicro2Panel;
    idMicro4Panel = microConfig.idMicro4Panel;
    cantidadMicro4Panel = microConfig.cantidadMicro4Panel;

    const costs = calculateMicroCosts(microConfig, params);
    costoMicroinversores = costs.costoMicroinversores;
    costoExtrasMicroinversores = costs.costoExtras;

    if (idMicro2Panel) {
      micro2Spec = params.microinverterSpecs.find(m => m.ID === idMicro2Panel) || null;
    }
    if (idMicro4Panel) {
      micro4Spec = params.microinverterSpecs.find(m => m.ID === idMicro4Panel) || null;
    }
  }

  // 5. Seleccionar montaje (greedy)
  const montajeCombo = buildMontajeCombination(cantidadPaneles, params);
  const montajeA = montajeCombo?.idA ? params.montajeSpecs.find(m => m.ID === montajeCombo.idA) : null;
  const montajeB = montajeCombo?.idB ? params.montajeSpecs.find(m => m.ID === montajeCombo.idB) : null;
  const costoMontajeUSD = montajeCombo?.costUSD || 0;
  const costoMontaje = costoMontajeUSD * tc;

  // 6. Calcular BOS
  const costoBOS = 263 * (metrosDistancia || 0) + 7500;

  // 7. Calcular transporte
  let costoTransporte = 0;
  if (microCentral === "central") {
    costoTransporte = (costoPaneles + costoInversor + costoMontaje) * params.deliveryCosts;
  } else {
    costoTransporte = (costoPaneles + costoMontaje + costoMicroinversores + costoExtrasMicroinversores) * params.deliveryCosts;
  }

  // 8. Calcular mano de obra
  const costoMO = potenciaPanel * cantidadPaneles * 5.8;

  // 9. Calcular seguro RC
  let costoSeguroRC = 0;
  if (microCentral === "central") {
    costoSeguroRC = (costoPaneles + costoInversor + costoMontaje + costoBOS + costoMO) * params.commercialConditions.Insurance_Rate;
  } else {
    costoSeguroRC = (costoPaneles + costoMontaje + costoMicroinversores + costoExtrasMicroinversores + costoBOS + costoMO) * params.commercialConditions.Insurance_Rate;
  }

  // 10. Costos extraordinarios y viáticos
  const costosExtraordinarios = params.commercialConditions.Extraordinarios || 0;
  const costosViaticos = 0;

  // 11. Calcular totales
  let costosTotales = 0;
  if (microCentral === "central") {
    costosTotales = costoPaneles + costoInversor + costoMontaje + costoBOS + costoTransporte + costoMO + costoSeguroRC + costosExtraordinarios + costosViaticos;
  } else {
    costosTotales = costoPaneles + costoMicroinversores + costoExtrasMicroinversores + costoMontaje + costoBOS + costoTransporte + costoMO + costoSeguroRC + costosExtraordinarios + costosViaticos;
  }

  const profitMargin = params.commercialConditions.Profit_Margin;
  const discountRate = params.commercialConditions.Discount_Rate;

  const precioLista = costosTotales / ((1 - profitMargin) * (1 - discountRate));
  const subtotal = costosTotales / (1 - profitMargin);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const grossProfit = subtotal - costosTotales;
  const grossProfitPostCAC = grossProfit - params.commercialConditions.CAC_MXN;

  const generacionAnual = (potenciaPanel / 1000) * cantidadPaneles * hsp * params.pr * 365;
  const impactoAmbiental = calculateEnvironmentalImpact(generacionAnual, params);

  return {
    // Panel info
    potencia_panel: potenciaPanel,
    cantidad_paneles: cantidadPaneles,
    id_panel: idPanel,
    area_needed: areaNeeded,
    kwp: (potenciaPanel * cantidadPaneles / 1000).toFixed(2),
    annual_degradation: panel.Annual_Degradation || 0,
    generacion: panelConfig.generacion,
    impacto_ambiental: impactoAmbiental,

    // Costos
    tc,
    costo_paneles: Math.round(costoPaneles),
    micro_central: microCentral,

    // Specs (for frontend display)
    panel_specs: panel,
    panel_specs_params: panel,
    inverter_specs: inverterSpec,
    inverter_specs_params: inverterSpec,
    microinverter_specs: [micro4Spec, micro2Spec].filter(Boolean),
    microinverter_specs_params: [micro4Spec, micro2Spec].filter(Boolean),
    montaje_specs: [montajeA, montajeB].filter(Boolean),
    montaje_specs_params: [montajeA, montajeB].filter(Boolean),

    // Inversor (si aplica)
    id_inversor: idInversor,
    costo_inversor: Math.round(costoInversor),

    // Microinversores (si aplica)
    id_micro_2_panel: idMicro2Panel,
    cantidad_micro_2_panel: cantidadMicro2Panel,
    id_micro_4_panel: idMicro4Panel,
    cantidad_micro_4_panel: cantidadMicro4Panel,
    costo_microinversores: Math.round(costoMicroinversores),
    costo_extras_microinversores: Math.round(costoExtrasMicroinversores),

    // Montaje
    id_montaje: montajeA?.ID || montajeB?.ID || null,
    id_montaje_a: montajeA?.ID || null,
    cantidad_montaje_a: montajeCombo?.countA || 0,
    id_montaje_b: montajeB?.ID || null,
    cantidad_montaje_b: montajeCombo?.countB || 0,
    costo_montaje: Math.round(costoMontaje),

    // Otros costos
    costo_bos: Math.round(costoBOS),
    costo_transporte_incl_seguro: Math.round(costoTransporte),
    costo_mo: Math.round(costoMO),
    costo_seguro_rc: Math.round(costoSeguroRC),
    costos_extraordinarios: Math.round(costosExtraordinarios),
    costos_viaticos: costosViaticos,

    // Totales
    costos_totales: Math.round(costosTotales),
    profit_margin: profitMargin,
    discount_rate: discountRate,
    precio_lista: Math.round(precioLista),
    subtotal: Math.round(subtotal),
    iva: Math.round(iva),
    total: Math.round(total),
    gross_profit: Math.round(grossProfit),
    gross_profit_post_cac: Math.round(grossProfitPostCAC),
    secuencia_exhibiciones: params.commercialConditions.Secuencia_Exhibiciones || "0.5,0.5"
  };
}

function buildFrontendOutputs({
  periodicidad,
  tarifa,
  pagoActual,
  pagoActualCargasExtra,
  kwhConsumidos,
  kwhConsumidosCargasExtra,
  propuestaActual,
  propuestaCargasExtra,
  hsp,
  params,
  pagoDACActual,
  pagoDACCargasExtra
}) {
  const base = propuestaActual
    ? computeFrontendBlock({
      periodicidad,
      tarifa,
      pagoActual,
      kwhObjetivo: kwhConsumidos,
      propuesta: propuestaActual,
      hsp,
      params,
      alertaDAC: pagoDACActual,
      impactoAmbiental: propuestaActual?.impacto_ambiental
    })
    : null;

  const extra = propuestaCargasExtra
    ? computeFrontendBlock({
      periodicidad,
      tarifa,
      pagoActual: pagoActualCargasExtra,
      kwhObjetivo: kwhConsumidosCargasExtra,
      propuesta: propuestaCargasExtra,
      hsp,
      params,
      alertaDAC: pagoDACCargasExtra,
      impactoAmbiental: propuestaCargasExtra?.impacto_ambiental
    })
    : null;

  return { base, cargas_extra: extra };
}

function computeFrontendBlock({ periodicidad, tarifa, pagoActual, kwhObjetivo, propuesta, hsp, params, alertaDAC, impactoAmbiental }) {
  const dias = periodicidad === "bimestral" ? 60 : 30;
  const generacion = (propuesta.potencia_panel / 1000) * propuesta.cantidad_paneles * hsp * params.pr * dias;
  const netoBimestral = periodicidad === "bimestral"
    ? (kwhObjetivo - generacion)
    : 2 * (kwhObjetivo - generacion);

  const pagoConSolar = calculatePostSolarPayment(netoBimestral, tarifa, params);
  const pagoActualBimestral = periodicidad === "bimestral" ? pagoActual : (pagoActual || 0) * 2;
  const ahorrasBimestre = pagoActualBimestral - (pagoConSolar || 0);

  const kwp = (propuesta.potencia_panel * propuesta.cantidad_paneles) / 1000;
  const porcentajeGeneracion = kwhObjetivo > 0 ? (generacion / kwhObjetivo) : null;

  const inversionTotal = propuesta.total || null;
  const roi = inversionTotal && ahorrasBimestre ? inversionTotal / (ahorrasBimestre * 6) : null;

  const annualDeg = propuesta.annual_degradation || 0;
  let ahorro25 = null;
  if (ahorrasBimestre && annualDeg !== null && annualDeg !== undefined) {
    if (annualDeg === 0) {
      ahorro25 = ahorrasBimestre * 6 * 25;
    } else {
      const factor = 1 - annualDeg;
      const numerador = 1 - Math.pow(factor, 25);
      const denominador = 1 - factor;
      ahorro25 = denominador !== 0 ? (numerador / denominador) * (ahorrasBimestre * 6) : null;
    }
  }

  const secuencia = (params.commercialConditions.Secuencia_Exhibiciones || "")
    .split(",")
    .map(v => Number(v.trim()))
    .filter(v => !Number.isNaN(v));
  const pagosEnExhibiciones = inversionTotal
    ? secuencia.map(v => v * inversionTotal)
    : [];

  const descuento = propuesta.discount_rate && propuesta.precio_lista
    ? propuesta.discount_rate * propuesta.precio_lista
    : null;

  const impacto = impactoAmbiental || propuesta.impacto_ambiental || null;

  return {
    con_solarya_pagaras: pagoConSolar,
    ahorras_cada_bimestre: ahorrasBimestre,
    tamano_sistema_kwp: kwp,
    no_y_tamano_paneles: { cantidad: propuesta.cantidad_paneles, potencia_w: propuesta.potencia_panel },
    energia_generada: generacion,
    generas_el_x_porcentaje_consumo: porcentajeGeneracion,
    ahorro_en_25_anos: ahorro25,
    retorno_de_inversion: roi,
    pagos_en_exhibiciones: pagosEnExhibiciones,
    precio_de_lista: propuesta.precio_lista,
    descuento,
    subtotal: propuesta.subtotal,
    iva: propuesta.iva,
    inversion_total: propuesta.total,
    alerta_dac: alertaDAC,
    impacto_ambiental: impacto
  };
}
