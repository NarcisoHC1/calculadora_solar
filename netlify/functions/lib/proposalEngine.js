// netlify/functions/lib/proposalEngine.js
// Main proposal generation engine

import { getParams, getHSPForMunicipio } from './params.js';
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
} from './calculations.js';

const IVA = 1.16;

export async function generateCompleteProposal(formData) {
  const params = await getParams();

  // 1. Determinar Factor_P
  const factorP = formData.periodicidad === "bimestral" ? 2 : 1;

  // 2. Determinar kWh_consumidos
  let kwhConsumidos = 0;

  if (formData.kwh_consumidos && formData.kwh_consumidos > 0) {
    // Escenario 4: OCR o input manual con kWh conocido
    kwhConsumidos = formData.kwh_consumidos;
  } else if (formData.pago_promedio && formData.tarifa && formData.tarifa !== "no conoce") {
    // Escenario 1 o 4: Tiene pago y tarifa conocida - cálculo inverso
    const tarifa = formData.tarifa.toUpperCase();

    if (tarifa === "1" || tarifa.startsWith("1")) {
      kwhConsumidos = calculateKwhFromPaymentTarifa1(formData.pago_promedio, factorP, params);
    } else if (tarifa === "PDBT") {
      kwhConsumidos = calculateKwhFromPaymentPDBT(formData.pago_promedio, factorP, params);
    } else if (tarifa === "DAC") {
      kwhConsumidos = calculateKwhFromPaymentDAC(formData.pago_promedio, factorP, params);
    } else {
      // Tarifa desconocida - estimar
      kwhConsumidos = estimateKwhFromGuess(formData, params);
    }
  } else {
    // Escenarios 2 y 3: Estimación por base de datos
    kwhConsumidos = estimateKwhFromGuess(formData, params);
  }

  // 3. Calcular cargas extra
  const extraKwh = calculateExtraLoads(formData.loads, formData.periodicidad, params);
  const kwhConCargasExtra = kwhConsumidos + extraKwh;

  // 4. Calcular metros distancia
  const metrosDistancia = calculateMetrosDistancia(
    formData.tipo_inmueble,
    formData.pisos,
    formData.distancia_techo_tablero,
    params
  );

  // 5. Obtener HSP
  const hsp = getHSPForMunicipio(formData.municipio || "Ciudad de México", params);

  // 6. Generar propuesta para consumo actual
  const propuestaActual = await generateSystemProposal(
    kwhConsumidos,
    formData.periodicidad,
    hsp,
    params
  );

  // 7. Generar propuesta con cargas extra (si aplica)
  let propuestaCargasExtra = null;
  if (extraKwh > 0) {
    propuestaCargasExtra = await generateSystemProposal(
      kwhConCargasExtra,
      formData.periodicidad,
      hsp,
      params
    );
  }

  // 8. Calcular pagos hipotéticos
  const pagoHipoteticoCargasExtra = extraKwh > 0
    ? calculateHypotheticalPayment(kwhConCargasExtra, formData.tarifa, factorP, params)
    : null;

  const pagoDACActual = calculateDACHypothetical(kwhConsumidos, formData.periodicidad, params);
  const pagoDACCargasExtra = extraKwh > 0
    ? calculateDACHypothetical(kwhConCargasExtra, formData.periodicidad, params)
    : null;

  return {
    kwh_consumidos: Math.round(kwhConsumidos),
    kwh_consumidos_y_cargas_extra: Math.round(kwhConCargasExtra),
    metros_distancia: metrosDistancia,
    pago_hipotetico_cargas_extra: pagoHipoteticoCargasExtra,
    pago_dac_hipotetico_consumo_actual: pagoDACActual,
    pago_dac_hipotetico_cargas_extra: pagoDACCargasExtra,
    propuesta_actual: propuestaActual,
    propuesta_cargas_extra: propuestaCargasExtra
  };
}

function estimateKwhFromGuess(formData, params) {
  if (formData.uso === "Casa" || formData.casa_negocio === "Casa") {
    const members = Number(formData.numero_personas) || 2;
    const guess = params.houseLoadsGuess.find(h => h.Members === members);
    return guess?.kWh_Bimestre || 300;
  } else {
    // Negocio
    const range = formData.rango_personas_negocio || "1-5";
    const guess = params.businessLoadsGuess.find(b => b.Range === range);
    return guess?.kWh_Bimestre || 500;
  }
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
