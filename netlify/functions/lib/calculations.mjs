// netlify/functions/lib/calculations.mjs
// Complete calculation logic following the prompt specifications

const IVA = 1.16;

export const MONTAGE_GREEDY_PROMPT = "Ordena montajes por capacidad, toma el mayor posible sin exceder los paneles restantes y repite; si sobra un residuo, reemplaza una de las piezas grandes por combinaciones de montajes más pequeños hasta cubrir exactamente el total, priorizando menos piezas y menor costo.";

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

  const legacyMatch = evSpecs.find(e => {
    const slug = `${(e.Brand || "").trim()} ${(e.Model || "").trim()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug === legacySlug;
  });
  if (legacyMatch) return legacyMatch;

  // Extra-tolerant fallback: ignore separators like hyphens/spaces inside the model name
  const normalizedValue = value.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Accept matches that ignore parenthetical aliases, e.g. "Dolphin Mini (Seagull)"
  const normalizedCandidates = [normalizedValue];
  const valueNoParens = value.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (valueNoParens && valueNoParens !== value) {
    normalizedCandidates.push(valueNoParens.toLowerCase().replace(/[^a-z0-9]/g, ""));
  }

  return evSpecs.find(e => {
    const specBase = `${(e.Brand || "").trim()} ${(e.Model || "").trim()}`;
    const specNormalized = specBase.toLowerCase().replace(/[^a-z0-9]/g, "");
    const specNoParens = specBase.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim()
      .toLowerCase().replace(/[^a-z0-9]/g, "");

    return normalizedCandidates.includes(specNormalized) || normalizedCandidates.includes(specNoParens);
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

export function calculateMetrosDistancia(tipoInmueble, pisos, distanciaReportada, params) {
  const tipo = normalizeTipoInmueble(tipoInmueble);

  const metersPerFloorRaw = params?.metersPerFloor;
  const metersPerFloor = Number.isFinite(Number(metersPerFloorRaw)) && Number(metersPerFloorRaw) > 0
    ? Number(metersPerFloorRaw)
    : 3;

  // Tipo 1: Casa o negocio independiente de 1-2 pisos
  if (tipo === "1") {
    return 30;
  }

  // Tipos que usan pisos: 2, 4, 5, 8, 9
  if (["2", "4", "5", "8", "9"].includes(tipo)) {
    const numPisos = Number(pisos) || 0;
    return 30 + numPisos * metersPerFloor;
  }

  // Tipos que usan metros: 3, 6, 7
  if (["3", "6", "7"].includes(tipo)) {
    return Math.max(30, Number(distanciaReportada) || 0);
  }

  return 30;
}

// ========================================
// OPTIMIZACIÓN DE PANELES
// ========================================

export function findOptimalPanelConfig(kwhTarget, periodicidad, hsp, pr, params) {
  const diasBimestre = 60;
  const diasPeriodo = periodicidad === "bimestral" ? diasBimestre : 30;

  // Potencia requerida en kWp según consumo bimestral, HSP de Airtable y PR de Airtable
  const potenciaRequeridaKw = kwhTarget / (hsp * diasBimestre * pr);

  let bestConfig = null;
  let bestError = Infinity;

  for (const panel of params.panelSpecs) {
    const potenciaPanelKw = panel.Capacity_W / 1000;

    for (let cantidadPaneles = 1; cantidadPaneles <= 50; cantidadPaneles++) {
      const potenciaInstaladaKw = potenciaPanelKw * cantidadPaneles;
      const generacionPeriodo = potenciaInstaladaKw * hsp * pr * diasPeriodo;
      const errorAbsoluto = Math.abs(generacionPeriodo - kwhTarget);

      if (errorAbsoluto < bestError) {
        bestError = errorAbsoluto;
        bestConfig = {
          panelId: panel.ID,
          potenciaPanel: panel.Capacity_W,
          cantidadPaneles,
          generacion: generacionPeriodo,
          generacionMensual: periodicidad === "bimestral" ? generacionPeriodo / 2 : generacionPeriodo,
          generacionAnual: (periodicidad === "bimestral" ? generacionPeriodo / 2 : generacionPeriodo) * 12,
          error: errorAbsoluto,
          panel
        };
        continue;
      }

      const esEmpate = Math.abs(errorAbsoluto - bestError) < 1e-6;
      const bestGeneracion = bestConfig?.generacion ?? 0;
      if (esEmpate) {
        const sobreActual = generacionPeriodo >= kwhTarget;
        const sobreMejor = bestGeneracion >= kwhTarget;
        if (sobreActual && !sobreMejor) {
          bestConfig = {
            panelId: panel.ID,
            potenciaPanel: panel.Capacity_W,
            cantidadPaneles,
            generacion: generacionPeriodo,
            generacionMensual: periodicidad === "bimestral" ? generacionPeriodo / 2 : generacionPeriodo,
            generacionAnual: (periodicidad === "bimestral" ? generacionPeriodo / 2 : generacionPeriodo) * 12,
            error: errorAbsoluto,
            panel
          };
          continue;
        }
      }
    }
  }

  if (!bestConfig) {
    throw new Error("No se pudo determinar configuración de paneles con los parámetros de Airtable");
  }

  // Documentar la potencia objetivo para trazabilidad
  bestConfig.potenciaObjetivoKw = potenciaRequeridaKw;

  return bestConfig;
}

// ========================================
// ALGORITMO DE MICROINVERSORES
// ========================================

export function calculateMicroinverters(cantidadPaneles, params) {
  // Selección greedy priorizando MPPT más alto; sólo se aceptan combinaciones con máximo 2 IDs y No_Trunk homogéneo
  const sortedSpecs = (params.microinverterSpecs || [])
    .map(spec => ({
      ...spec,
      mppt: Number(spec.MPPT),
      noTrunk: (spec.No_Trunk || "").toString().toLowerCase()
    }))
    .filter(spec => Number.isFinite(spec.mppt) && spec.mppt > 0)
    .sort((a, b) => {
      if (b.mppt !== a.mppt) return b.mppt - a.mppt; // prioriza MPPT alto
      return (a.Price_USD || 0) - (b.Price_USD || 0);
    });

  const combinations = [];

  const dfs = (idx, remaining, current, currentNoTrunk) => {
    if (remaining === 0) {
      if (!current.length) return;
      combinations.push({ items: current, noTrunk: currentNoTrunk });
      return;
    }
    if (idx >= sortedSpecs.length) return;

    const spec = sortedSpecs[idx];
    const maxCount = Math.floor(remaining / spec.mppt);

    for (let count = maxCount; count >= 0; count--) {
      if (count === 0) {
        dfs(idx + 1, remaining, current, currentNoTrunk);
        continue;
      }

      if (currentNoTrunk && currentNoTrunk !== spec.noTrunk) continue;

      const panelsCubiertos = count * spec.mppt;
      if (panelsCubiertos > remaining) continue;

      dfs(
        idx + 1,
        remaining - panelsCubiertos,
        [...current, { spec, count }],
        currentNoTrunk || spec.noTrunk
      );
    }
  };

  dfs(0, cantidadPaneles, [], null);

  const combosSinTrunk = combinations.filter(c => c.noTrunk === "si" && c.items.length <= 2);
  const combosConTrunk = combinations.filter(c => c.noTrunk === "no" && c.items.length <= 2);

  const seleccionarPorCosto = (lista) => {
    return lista
      .map(combo => {
        const costoUSD = combo.items.reduce((acc, item) => acc + (item.spec.Price_USD || 0) * item.count, 0);
        const totalMicros = combo.items.reduce((acc, item) => acc + item.count, 0);
        const totalPaneles = combo.items.reduce((acc, item) => acc + item.count * item.spec.mppt, 0);
        return { ...combo, costoUSD, totalMicros, totalPaneles };
      })
      .sort((a, b) => {
        if (a.costoUSD !== b.costoUSD) return a.costoUSD - b.costoUSD;
        return a.totalMicros - b.totalMicros;
      })[0];
  };

  const mejorSi = seleccionarPorCosto(combosSinTrunk);
  const mejorNo = seleccionarPorCosto(combosConTrunk);

  const elegida = mejorSi || mejorNo;

  if (!elegida) {
    throw new Error("❌ No se encontró combinación de microinversores que cubra todos los paneles");
  }

  const idPrimario = elegida.items[0]?.spec.ID || null;
  const countPrimario = elegida.items[0]?.count || 0;
  const idSecundario = elegida.items[1]?.spec.ID || null;
  const countSecundario = elegida.items[1]?.count || 0;

  return {
    microCombination: elegida,
    cantidadTotalMicros: elegida.totalMicros,
    idMicroPrimario: idPrimario,
    cantidadMicroPrimario: countPrimario,
    idMicroSecundario: idSecundario,
    cantidadMicroSecundario: countSecundario,
    requiereTrunk: elegida.noTrunk === "no"
  };
}

// ========================================
// CÁLCULO DE COSTOS DE MICROINVERSORES
// ========================================

export function calculateMicroCosts(microConfig, params) {
  const tc = params.commercialConditions.MXN_USD;

  const costoMicroinversoresUSD = microConfig.microCombination.items.reduce(
    (acc, item) => acc + (item.spec.Price_USD || 0) * item.count,
    0
  );

  const dtu = params.dtuSpecs?.[0];
  if (!dtu?.Price_USD) {
    throw new Error("❌ DTU_Specs.Params sin precio");
  }

  const microExtras = {
    trunk: params.microExtras.find(e => e.Type === "Trunk_Cable"),
    endCap: params.microExtras.find(e => e.Type === "End_Cap"),
    acConnector: params.microExtras.find(e => e.Type === "AC_Connector")
  };

  if (!microExtras.endCap?.Price_USD || (!microExtras.trunk?.Price_USD && !microExtras.acConnector?.Price_USD)) {
    throw new Error("❌ Micro_extras.Params incompletos");
  }

  const costoExtrasUSD = microConfig.requiereTrunk
    ? (dtu.Price_USD + (microExtras.trunk.Price_USD * microConfig.cantidadTotalMicros) + microExtras.endCap.Price_USD)
    : (dtu.Price_USD + microExtras.acConnector.Price_USD + microExtras.endCap.Price_USD);

  return {
    costoMicroinversores: Math.round(costoMicroinversoresUSD * tc),
    costoExtras: Math.round(costoExtrasUSD * tc)
  };
}

// ========================================
// GREEDY DE MONTAJES (2 tipos máx.)
// ========================================

export function buildMontajeCombination(cantidadPaneles, params) {
  const montajes = (params.montajeSpecs || [])
    .filter(m => m.No_Panels)
    .sort((a, b) => b.No_Panels - a.No_Panels || (a.Price_USD || 0) - (b.Price_USD || 0));

  const objetivo = cantidadPaneles === 1 ? 2 : cantidadPaneles;
  const candidates = [];

  for (const montA of montajes) {
    const maxA = Math.floor(objetivo / montA.No_Panels);
    for (let countA = maxA; countA >= 0; countA--) {
      const restante = objetivo - (countA * montA.No_Panels);
      if (restante === 0 && countA > 0) {
        candidates.push({
          idA: montA.ID,
          countA,
          idB: null,
          countB: 0,
          costUSD: (montA.Price_USD || 0) * countA,
          piezas: countA
        });
        continue;
      }

      for (const montB of montajes) {
        if (montB.No_Panels === 0) continue;
        if (restante % montB.No_Panels !== 0) continue;
        const countB = restante / montB.No_Panels;
        if (countA === 0 && countB === 0) continue;
        candidates.push({
          idA: montA.ID,
          countA,
          idB: montB.ID,
          countB,
          costUSD: (montA.Price_USD || 0) * countA + (montB.Price_USD || 0) * countB,
          piezas: countA + countB
        });
      }
    }
  }

  const best = candidates
    .filter(c => c.piezas > 0)
    .sort((a, b) => {
      if (a.piezas !== b.piezas) return a.piezas - b.piezas; // mínima cantidad de estructuras
      return a.costUSD - b.costUSD;
    })[0];

  if (!best) {
    throw new Error("❌ No se encontró combinación de montaje que cubra los paneles");
  }

  return best;
}

// ========================================
// IMPACTO AMBIENTAL
// ========================================

export function calculateEnvironmentalImpact(generacionAnualKwh, params) {
  const factor = (concept) => {
    const record = (params.environmentalImpact || []).find(e => (e.Concept || "").toLowerCase() === concept.toLowerCase());
    return record?.Factor || 0;
  };

  const carbon = generacionAnualKwh * factor("Carbon");
  const trees = generacionAnualKwh * factor("Trees_Annual");
  const oil = generacionAnualKwh * factor("Oil_Barrels");

  return {
    carbon,
    trees,
    oil
  };
}

// ========================================
// SELECCIÓN DE INVERSOR CENTRAL
// ========================================

export function selectCentralInverter(cantidadPaneles, potenciaPanel, params) {
  const potenciaObjetivoKw = (cantidadPaneles * potenciaPanel / 1000) / params.oversizingFactor;

  const candidates = (params.inverterSpecs || [])
    .filter(inv => inv.Capacity_kW)
    .map(inv => ({ ...inv, distancia: Math.abs(inv.Capacity_kW - potenciaObjetivoKw) }))
    .sort((a, b) => {
      if (a.distancia !== b.distancia) return a.distancia - b.distancia;
      if (a.Price_USD !== b.Price_USD) return a.Price_USD - b.Price_USD;
      if ((a.Product_Warranty_Years || 0) !== (b.Product_Warranty_Years || 0)) {
        return (b.Product_Warranty_Years || 0) - (a.Product_Warranty_Years || 0);
      }
      return Math.random() - 0.5;
    });

  const elegido = candidates[0];

  if (!elegido) {
    throw new Error("❌ No se encontró inversor central que cumpla el dimensionamiento");
  }

  elegido.potenciaObjetivoKw = potenciaObjetivoKw;
  return elegido;
}

// ========================================
// SELECCIÓN DE MONTAJE
// ========================================

export function selectMontaje(cantidadPaneles, params) {
  const candidates = params.montajeSpecs
    .filter(m => m.No_Panels === cantidadPaneles)
    .sort((a, b) => {
      if (a.Price_USD !== b.Price_USD) return a.Price_USD - b.Price_USD;
      const aw = a.Product_Warranty_Years || 0;
      const bw = b.Product_Warranty_Years || 0;
      return bw - aw;
    });

  return candidates[0] || null;
}

// ========================================
// CÁLCULO DE PAGO DAC HIPOTÉTICO
// ========================================

export function calculateDACHypothetical(kwhConsumidos, periodicidad, tarifaBase, params) {
  const kwh = Number(kwhConsumidos);
  if (!Number.isFinite(kwh) || kwh <= 0) return null;

  const dac = params.tarifaDAC;
  if (!dac) return null;

  const period = (periodicidad || "").toLowerCase() === "mensual" ? "mensual" : "bimestral";
  const factorP = period === "bimestral" ? 2 : 1;

  const limiteDAC = dac.Limite_Mensual_kWh * factorP;
  if (kwh <= limiteDAC) return null;

  const fijo = dac.Fijo_Mensual * factorP * IVA;
  const variable = dac.Variable * kwh * IVA;

  return fijo + variable;
}

export function calculatePostSolarPayment(netoBimestralKwh, tarifa, params) {
  if (netoBimestralKwh === null || netoBimestralKwh === undefined) return null;

  const factorP = 2; // Siempre evaluamos en equivalente bimestral
  const tarifaUpper = (tarifa || "").toString().toUpperCase();

  if (netoBimestralKwh < 0) {
    if (tarifaUpper === "1" || tarifaUpper.startsWith("1")) {
      return params.tarifa1.Min_Mensual_kWh * params.tarifa1.Basico * factorP * IVA;
    }
    if (tarifaUpper === "PDBT") {
      return params.tarifaPDBT.Fijo_Mensual * factorP * IVA;
    }
    if (tarifaUpper === "DAC") {
      return params.tarifaDAC.Fijo_Mensual * factorP * IVA;
    }
    return null;
  }

  if (tarifaUpper === "1" || tarifaUpper.startsWith("1")) {
    const pago = calculatePaymentFromKwhTarifa1(netoBimestralKwh, factorP, params);
    const minimo = params.tarifa1.Min_Mensual_kWh * params.tarifa1.Basico * factorP * IVA;
    return Math.max(pago, minimo);
  }

  if (tarifaUpper === "PDBT") {
    return calculatePaymentFromKwhPDBT(netoBimestralKwh, factorP, params);
  }

  if (tarifaUpper === "DAC") {
    return calculatePaymentFromKwhDAC(netoBimestralKwh, factorP, params);
  }

  return calculatePaymentFromKwhTarifa1(netoBimestralKwh, factorP, params);
}
