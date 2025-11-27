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
  selectMontaje,
  calculateDACHypothetical
} from './calculations.mjs';

const IVA = 1.16;

export async function generateCompleteProposal(formData) {
  const params = await getParams();

  const periodicidad = formData.periodicidad || "bimestral";

  // 1. Determinar Factor_P (default: bimestral)
  const factorP = periodicidad === "mensual" ? 1 : 2;

  // 2. Adivinar tarifa si no se proporcionó
  let tarifaFinal = formData.tarifa || "";
  if (!tarifaFinal || tarifaFinal === "no conoce") {
    tarifaFinal = guessTarifa(formData, params, factorP);
  }

  // 3. Determinar kWh_consumidos y pago
  let kwhConsumidos = 0;
  let pagoPromedio = formData.pago_promedio || 0;

  if (formData.kwh_consumidos && formData.kwh_consumidos > 0) {
    // Tiene kWh conocido
    kwhConsumidos = formData.kwh_consumidos;
    // Calcular pago si no lo tiene
    if (!pagoPromedio) {
      pagoPromedio = calculatePaymentFromKwh(kwhConsumidos, tarifaFinal, factorP, params);
    }
  } else if (pagoPromedio && pagoPromedio > 0 && tarifaFinal && tarifaFinal !== "no conoce") {
    // Tiene pago y tarifa - calcular kWh
    kwhConsumidos = calculateKwhFromPayment(pagoPromedio, tarifaFinal, factorP, params);
  } else {
    // No tiene ni kWh ni pago - estimar ambos desde guesses
    const estimation = estimateFromGuess(formData, tarifaFinal, factorP, params);
    kwhConsumidos = estimation.kwh;
    pagoPromedio = estimation.pago;
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
    params
  );

  // 7. Generar propuesta con cargas extra (si aplica)
  let propuestaCargasExtra = null;
  if (extraKwh > 0) {
    propuestaCargasExtra = await generateSystemProposal(
      kwhConCargasExtra,
      periodicidad,
      hsp,
      params
    );
  }

  // 8. Calcular pagos hipotéticos
  const pagoHipoteticoCargasExtra = extraKwh > 0
    ? calculateHypotheticalPayment(kwhConCargasExtra, tarifaFinal, factorP, params)
    : null;

  const pagoDACActual = calculateDACHypothetical(kwhConsumidos, periodicidad, params);
  const pagoDACCargasExtra = extraKwh > 0
    ? calculateDACHypothetical(kwhConCargasExtra, periodicidad, params)
    : null;

  return {
    tarifa: tarifaFinal,
    kwh_consumidos: Math.round(kwhConsumidos),
    pago_promedio: Math.round(pagoPromedio),
    kwh_consumidos_y_cargas_extra: Math.round(kwhConCargasExtra),
    metros_distancia: metrosDistancia,
    pago_hipotetico_cargas_extra: pagoHipoteticoCargasExtra,
    pago_dac_hipotetico_consumo_actual: pagoDACActual,
    pago_dac_hipotetico_cargas_extra: pagoDACCargasExtra,
    propuesta_actual: propuestaActual,
    propuesta_cargas_extra: propuestaCargasExtra
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

  const isCasa = formData.uso === "Casa" || formData.casa_negocio === "Casa" || (!formData.uso && !formData.casa_negocio);

  if (isCasa) {
    const members = Number(formData.numero_personas) || 2;
    const guess = params.houseLoadsGuess.find(h => h.Members === members);
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

async function generateSystemProposal(kwhTarget, periodicidad, hsp, params) {
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

  if (microCentral === "central") {
    // Sistema con inversor central
    const inverter = selectCentralInverter(cantidadPaneles, potenciaPanel, params);
    if (inverter) {
      idInversor = inverter.ID;
      costoInversor = inverter.Price_USD * tc;
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
  }

  // 5. Seleccionar montaje
  const montaje = selectMontaje(cantidadPaneles, params);
  const idMontaje = montaje?.ID || null;
  const costoMontaje = montaje ? montaje.Price_USD * tc : 0;

  // 6. Calcular BOS
  const costoBOS = 263 * params.metersPerFloor * 3 + 7500; // Simplificado

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

  return {
    // Panel info
    potencia_panel: potenciaPanel,
    cantidad_paneles: cantidadPaneles,
    id_panel: idPanel,
    area_needed: areaNeeded,
    kwp: (potenciaPanel * cantidadPaneles / 1000).toFixed(2),

    // Costos
    tc,
    costo_paneles: Math.round(costoPaneles),
    micro_central: microCentral,

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
    id_montaje: idMontaje,
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
