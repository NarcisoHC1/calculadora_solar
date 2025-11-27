// netlify/functions/lib/calculations.mjs
// Complete calculation logic following the prompt specifications

const IVA = 1.16;

function findEvSpecBySelection(selection, evSpecs) {
  if (!selection) return null;
  const value = selection.trim();

  // Explicit "Otro" option: Brand === "Otro" and Model is empty
  if (value === "Otro") {
    return evSpecs.find(e => e.Brand === "Otro");
  }

  // Split the "Brand - Model" string coming from the dropdown
  const parts = value.split(" - ");
  if (parts.length === 2) {
    const [brand, model] = parts.map(p => p.trim());
    const match = evSpecs.find(e => (e.Brand || "").trim() === brand && (e.Model || "").trim() === model);
    if (match) return match;
  }

  // Fallback: try an exact combined match without altering case
  const combined = evSpecs.find(e => `${e.Brand} - ${e.Model}` === value);
  if (combined) return combined;

  // Final fallback: accept legacy slug values to avoid breaking older submissions
  const legacySlug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return evSpecs.find(e => {
    const slug = `${(e.Brand || "").trim()} ${(e.Model || "").trim()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug === legacySlug;
  }) || null;
}

// ========================================
// CÁLCULO INVERSO (DINERO -> ENERGÍA)
// ========================================

export function calculateKwhFromPaymentTarifa1(pagoMXN, factorP, params) {
  const t1 = params.tarifa1;

  const techoBasicoMXN = t1.Basico * t1.Basico_Lim_Mensual * factorP * IVA;
  const techoIntermedioMXN = t1.Intermedio * t1.Intermedio_Lim_Mensual * factorP * IVA;

  if (pagoMXN <= techoBasicoMXN) {
    return pagoMXN / IVA / t1.Basico;
  }

  if (pagoMXN <= (techoBasicoMXN + techoIntermedioMXN)) {
    return (t1.Basico_Lim_Mensual * factorP) +
           ((pagoMXN - techoBasicoMXN) / IVA / t1.Intermedio);
  }

  return (t1.Basico_Lim_Mensual * factorP) +
         (t1.Intermedio_Lim_Mensual * factorP) +
         ((pagoMXN - techoBasicoMXN - techoIntermedioMXN) / IVA / t1.Excedente);
}

export function calculateKwhFromPaymentPDBT(pagoMXN, factorP, params) {
  const pdbt = params.tarifaPDBT;
  return (pagoMXN - (pdbt.Fijo_Mensual * factorP * IVA)) / IVA / pdbt.Variable;
}

export function calculateKwhFromPaymentDAC(pagoMXN, factorP, params) {
  const dac = params.tarifaDAC;
  return (pagoMXN - (dac.Fijo_Mensual * factorP * IVA)) / IVA / dac.Variable;
}

// ========================================
// CÁLCULO DIRECTO (ENERGÍA -> DINERO)
// ========================================

export function calculatePaymentFromKwhTarifa1(consumo, factorP, params) {
  const t1 = params.tarifa1;

  if (consumo <= (t1.Basico_Lim_Mensual * factorP)) {
    return consumo * t1.Basico * IVA;
  }

  if (consumo <= ((t1.Basico_Lim_Mensual * factorP) + (t1.Intermedio_Lim_Mensual * factorP))) {
    return (t1.Basico * t1.Basico_Lim_Mensual * factorP * IVA) +
           ((consumo - (t1.Basico_Lim_Mensual * factorP)) * t1.Intermedio * IVA);
  }

  return (t1.Basico * t1.Basico_Lim_Mensual * factorP * IVA) +
         (t1.Intermedio * t1.Intermedio_Lim_Mensual * factorP * IVA) +
         ((consumo - (t1.Basico_Lim_Mensual * factorP) - (t1.Intermedio_Lim_Mensual * factorP)) * t1.Excedente * IVA);
}

export function calculatePaymentFromKwhPDBT(consumo, factorP, params) {
  const pdbt = params.tarifaPDBT;
  return (pdbt.Fijo_Mensual * factorP * IVA) + (consumo * pdbt.Variable * IVA);
}

export function calculatePaymentFromKwhDAC(consumo, factorP, params) {
  const dac = params.tarifaDAC;
  return (dac.Fijo_Mensual * factorP * IVA) + (consumo * dac.Variable * IVA);
}

// ========================================
// CÁLCULO DE CARGAS EXTRA
// ========================================

export function calculateExtraLoads(loads, periodicidad, params) {
  let suma = 0;
  const factorP = periodicidad === "mensual" ? 1 : 2;
  const dias = factorP * 30;

  // A. Auto Eléctrico (EV)
  if (loads?.ev?.modelo && loads?.ev?.km) {
    const evSpecsRecord = findEvSpecBySelection(loads.ev.modelo, params.evSpecs);
    if (!evSpecsRecord || evSpecsRecord["kWh/100km"] === undefined) {
      throw new Error(`❌ EV consumption not found for model: ${loads.ev.modelo}`);
    }

    const kmDiarios = Number(loads.ev.km) || 0;
    const kwhPer100km = evSpecsRecord["kWh/100km"];
    suma += (kmDiarios / 100) * kwhPer100km * dias * 0.9;
  }

  // B. Minisplits / Aire Acondicionado
  if (loads?.minisplit?.cantidad && loads?.minisplit?.horas) {
    if (params.acConsumption === undefined || params.acConsumption === null) {
      throw new Error("❌ AC consumption not found in Airtable params");
    }

    const cantidad = Number(loads.minisplit.cantidad) || 0;
    const horas = Number(loads.minisplit.horas) || 0;
    suma += cantidad * horas * params.acConsumption * dias;
  }

  // C. Secadora de Ropa
  if (loads?.secadora?.horas) {
    if (params.secadoraConsumption === undefined || params.secadoraConsumption === null) {
      throw new Error("❌ Secadora consumption not found in Airtable params");
    }

    const horasSemanales = Number(loads.secadora.horas) || 0;
    const semanas = periodicidad === "bimestral" ? 8 : 4;
    suma += horasSemanales * params.secadoraConsumption * semanas;
  }

  // D. Bomba de Agua
  if (loads?.bomba) {
    const bombaRecord = params.otherLoads.find(l => l.Load_type === "Bomba de agua");
    if (!bombaRecord?.Daily_Consumption_kWh) {
      throw new Error("❌ Bomba consumption not found in Airtable");
    }

    suma += bombaRecord.Daily_Consumption_kWh * dias;
  }

  // E. Otros
  if (loads?.otro) {
    const otroRecord = params.otherLoads.find(l => l.Load_type === "Otro");
    if (!otroRecord?.Daily_Consumption_kWh) {
      throw new Error("❌ Otro consumption not found in Airtable");
    }

    suma += otroRecord.Daily_Consumption_kWh * dias;
  }

  return Math.round(suma);
}

// ========================================
// CÁLCULO DE METROS DISTANCIA
// ========================================

export function calculateMetrosDistancia(tipoInmueble, pisos, distanciaReportada, params) {
  // Tipo 1: Casa o negocio independiente de 1-2 pisos
  if (tipoInmueble === "1" || tipoInmueble === "Casa o negocio independiente de 1-2 pisos") {
    return 30;
  }

  // Tipos que usan pisos: 2, 4, 5, 8, 9
  if (["2", "4", "5", "8", "9"].includes(tipoInmueble)) {
    const numPisos = Number(pisos) || 0;
    return numPisos * params.metersPerFloor + 30;
  }

  // Tipos que usan metros: 3, 6, 7
  if (["3", "6", "7"].includes(tipoInmueble)) {
    return Math.max(30, Number(distanciaReportada) || 30);
  }

  return 30;
}

// ========================================
// OPTIMIZACIÓN DE PANELES
// ========================================

export function findOptimalPanelConfig(kwhTarget, periodicidad, hsp, pr, params) {
  const dias = periodicidad === "bimestral" ? 60 : 30;
  const potenciaRequerida = kwhTarget / (hsp * pr * dias);

  let bestConfig = null;
  let bestError = Infinity;

  for (const panel of params.panelSpecs) {
    const potenciaPanelKw = panel.Capacity_W / 1000;
    const numPanelesReal = potenciaRequerida / potenciaPanelKw;

    const numPanelesFloor = Math.floor(numPanelesReal);
    const numPanelesCeil = Math.ceil(numPanelesReal);

    for (const numPaneles of [numPanelesFloor, numPanelesCeil]) {
      if (numPaneles <= 0) continue;

      const generacion = (panel.Capacity_W / 1000) * numPaneles * hsp * pr * dias;
      const error = Math.abs(generacion - kwhTarget) / kwhTarget;

      if (error < bestError) {
        bestError = error;
        bestConfig = {
          panelId: panel.ID,
          potenciaPanel: panel.Capacity_W,
          cantidadPaneles: numPaneles,
          generacion,
          error,
          panel
        };
      }
    }
  }

  return bestConfig;
}

// ========================================
// ALGORITMO DE MICROINVERSORES
// ========================================

export function calculateMicroinverters(cantidadPaneles, params) {
  const quadsTeoricos = Math.floor(cantidadPaneles / 4);
  const residuo = cantidadPaneles % 4;

  let cantidadMicro4Panel = 0;
  let cantidadMicro2Panel = 0;

  if (residuo === 0) {
    cantidadMicro4Panel = quadsTeoricos;
    cantidadMicro2Panel = 0;
  } else if (residuo === 1) {
    cantidadMicro4Panel = quadsTeoricos + 1;
    cantidadMicro2Panel = 0;
  } else if (residuo === 2) {
    cantidadMicro4Panel = quadsTeoricos;
    cantidadMicro2Panel = 1;
  } else if (residuo === 3) {
    cantidadMicro4Panel = quadsTeoricos + 1;
    cantidadMicro2Panel = 0;
  }

  const cantidadTotalMicros = cantidadMicro4Panel + cantidadMicro2Panel;

  // Selección de modelo
  let idMicro2Panel = null;
  let idMicro4Panel = null;

  if (cantidadMicro2Panel > 0) {
    // Sistema MIXTO - requiere Trunk (No_Trunk="no")
    const micro2 = params.microinverterSpecs.find(m => m.MPPT === 2 && m.No_Trunk === "no");
    const micro4 = params.microinverterSpecs.find(m => m.MPPT === 4 && m.No_Trunk === "no");
    idMicro2Panel = micro2?.ID || null;
    idMicro4Panel = micro4?.ID || null;
  } else {
    // Sistema PURO 4T - preferir DW (No_Trunk="si")
    const micro4 = params.microinverterSpecs.find(m => m.MPPT === 4 && m.No_Trunk === "si");
    idMicro4Panel = micro4?.ID || null;
  }

  return {
    cantidadMicro2Panel,
    cantidadMicro4Panel,
    cantidadTotalMicros,
    idMicro2Panel,
    idMicro4Panel,
    isDW: cantidadMicro2Panel === 0
  };
}

// ========================================
// CÁLCULO DE COSTOS DE MICROINVERSORES
// ========================================

export function calculateMicroCosts(microConfig, params) {
  const tc = params.commercialConditions.MXN_USD;

  let costoMicroinversores = 0;

  if (microConfig.idMicro2Panel && microConfig.cantidadMicro2Panel > 0) {
    const micro2 = params.microinverterSpecs.find(m => m.ID === microConfig.idMicro2Panel);
    costoMicroinversores += (micro2?.Price_USD || 0) * microConfig.cantidadMicro2Panel;
  }

  if (microConfig.idMicro4Panel && microConfig.cantidadMicro4Panel > 0) {
    const micro4 = params.microinverterSpecs.find(m => m.ID === microConfig.idMicro4Panel);
    costoMicroinversores += (micro4?.Price_USD || 0) * microConfig.cantidadMicro4Panel;
  }

  costoMicroinversores *= tc;

  // Calcular extras
  const dtu = params.dtuSpecs[0]; // Asumimos primer DTU
  let costoExtras = 0;

  if (microConfig.isDW) {
    // CASO A: SISTEMA DW
    const acConnector = params.microExtras.find(e => e.Type === "AC_Connector");
    const endCap = params.microExtras.find(e => e.Type === "End_Cap");
    costoExtras = (
      (dtu?.Price_USD || 0) +
      (acConnector?.Price_USD || 0) +
      (endCap?.Price_USD || 0)
    ) * tc;
  } else {
    // CASO B: SISTEMA TRUNK
    const trunkCable = params.microExtras.find(e => e.Type === "Trunk_Cable");
    const endCap = params.microExtras.find(e => e.Type === "End_Cap");
    costoExtras = (
      (dtu?.Price_USD || 0) +
      ((trunkCable?.Price_USD || 0) * microConfig.cantidadTotalMicros) +
      (endCap?.Price_USD || 0)
    ) * tc;
  }

  return { costoMicroinversores, costoExtras };
}

// ========================================
// SELECCIÓN DE INVERSOR CENTRAL
// ========================================

export function selectCentralInverter(cantidadPaneles, potenciaPanel, params) {
  const potenciaRequerida = (cantidadPaneles * potenciaPanel / 1000) / params.oversizingFactor;

  const suitable = params.inverterSpecs
    .filter(inv => inv.Capacity_kW >= potenciaRequerida)
    .sort((a, b) => {
      if (a.Price_USD !== b.Price_USD) return a.Price_USD - b.Price_USD;
      if (a.Product_Warranty_Years !== b.Product_Warranty_Years) return b.Product_Warranty_Years - a.Product_Warranty_Years;
      return 0;
    });

  return suitable[0] || null;
}

// ========================================
// SELECCIÓN DE MONTAJE
// ========================================

export function selectMontaje(cantidadPaneles, params) {
  const montaje = params.montajeSpecs.find(m => m.No_Panels === cantidadPaneles);
  return montaje || null;
}

// ========================================
// CÁLCULO DE PAGO DAC HIPOTÉTICO
// ========================================

export function calculateDACHypothetical(kwhConsumidos, periodicidad, params) {
  const factorP = periodicidad === "bimestral" ? 2 : 1;
  const dac = params.tarifaDAC;

  const limiteDAC = periodicidad === "bimestral"
    ? 2 * dac.Limite_Mensual_kWh
    : dac.Limite_Mensual_kWh;

  if (kwhConsumidos >= limiteDAC) {
    return dac.Fijo_Mensual * factorP * IVA + dac.Variable * kwhConsumidos * IVA;
  }

  return null;
}
