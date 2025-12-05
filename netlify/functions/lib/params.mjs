// netlify/functions/lib/params.mjs
// Fetches and caches parameters from Airtable Params database

const PARAMS_BASE_ID = process.env.AIRTABLE_PARAMS_BASE || "appjBih1L25LKSgPJ";
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

let paramsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function findEvSpecBySelection(selection, evSpecs) {
  if (!selection) return null;
  const value = selection.trim();

  if (value === "Otro") {
    return evSpecs.find(e => e.Brand === "Otro");
  }

  const parts = value.split(" - ");
  if (parts.length === 2) {
    const [brand, model] = parts.map(p => p.trim());
    const match = evSpecs.find(e => (e.Brand || "").trim() === brand && (e.Model || "").trim() === model);
    if (match) return match;
  }

  const combined = evSpecs.find(e => `${e.Brand} - ${e.Model}` === value);
  if (combined) return combined;

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

async function fetchTable(tableName) {
  const url = `https://api.airtable.com/v0/${PARAMS_BASE_ID}/${encodeURIComponent(tableName)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch ${tableName}: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();

  console.log(`📊 ${tableName}: received ${data.records?.length || 0} records from Airtable`);

  if (!data.records || data.records.length === 0) {
    console.warn(`⚠️ WARNING: ${tableName} has no records`);
    return [];
  }

  // Log first record structure to debug
  if (data.records[0]) {
    console.log(`   First record structure:`, JSON.stringify(data.records[0], null, 2).substring(0, 500));
  }

  const records = data.records.map(r => r.fields);

  // Check if fields are empty
  if (records[0] && Object.keys(records[0]).length === 0) {
    console.error(`❌ ${tableName}: First record has empty fields object!`);
    console.error(`   Raw record:`, JSON.stringify(data.records[0]));
  }

  return records;
}

export async function getParams() {
  const now = Date.now();

  // Return cached params if still valid
  if (paramsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_TTL)) {
    return paramsCache;
  }

  console.log("🔄 Fetching fresh params from Airtable...");

  // Fetch all parameter tables
  const [
    tarifa1,
    tarifaPDBT,
    tarifaDAC,
    hsp,
    pr,
    spaceMultiplier,
    metersPerFloor,
    oversizingFactor,
    evSpecs,
    acConsumption,
    secadoraConsumption,
    otherLoads,
    commercialConditions,
    panelSpecs,
    microinverterSpecs,
    microExtras,
    dtuSpecs,
    inverterSpecs,
    montajeSpecs,
    deliveryCosts,
    businessLoadsGuess,
    houseLoadsGuess,
    environmentalImpact
  ] = await Promise.all([
    fetchTable("Tarifa_1_CFE"),
    fetchTable("Tarifa_PDBT_CFE"),
    fetchTable("Tarifa_DAC_CFE"),
    fetchTable("HSP"),
    fetchTable("PR"),
    fetchTable("Space_Multiplier"),
    fetchTable("Meters_per_floor"),
    fetchTable("Oversizing_factor"),
    fetchTable("EV_Specs"),
    fetchTable("AC_Consumption"),
    fetchTable("Secadora_Consumption"),
    fetchTable("Other_Loads_Consumption"),
    fetchTable("Commercial_Conditions"),
    fetchTable("Panel_Specs"),
    fetchTable("Microinverter_Specs"),
    fetchTable("Micro_extras"),
    fetchTable("DTU_Specs"),
    fetchTable("Inverter _Specs"),
    fetchTable("Montaje_Specs"),
    fetchTable("Delivery_Costs"),
    fetchTable("Business_Loads_Guess"),
    fetchTable("House_Loads_Guess"),
    fetchTable("Environmental_Impact")
  ]);

  // Get latest tarifa records (most recent by year/month)
  const latestTarifa1 = tarifa1.sort((a, b) => b.Ano - a.Ano || b.Mes - a.Mes)[0];
  const latestTarifaPDBT = tarifaPDBT.sort((a, b) => b.Ano - a.Ano || b.Mes - a.Mes)[0];
  const latestTarifaDAC = tarifaDAC.sort((a, b) => b.Ano - a.Ano || b.Mes - a.Mes)[0];

  if (!latestTarifa1 || !latestTarifaPDBT || !latestTarifaDAC) {
    throw new Error("❌ Missing tarifa data in Airtable Params");
  }

  // Get first record from each table (only first row has values per user)
  // Ignore "Version"/"Parameter_Version" columns - just pseudo-IDs
  const prRecord = pr[0];
  const spaceMultiplierRecord = spaceMultiplier[0];
  const metersPerFloorRecord = metersPerFloor[0];
  const oversizingFactorRecord = oversizingFactor[0];
  const acConsumptionRecord = acConsumption[0];
  const secadoraConsumptionRecord = secadoraConsumption[0];
  const deliveryCostsRecord = deliveryCosts[0];
  const commercialConditionsRecord = commercialConditions[0];

  // Validate critical params with detailed logging
  console.log("🔍 Validating params...");
  console.log(`PR: ${pr.length} records, first:`, prRecord);
  console.log(`Commercial_Conditions: ${commercialConditions.length} records, first:`, commercialConditionsRecord);

  if (!prRecord) {
    throw new Error(`❌ PR table returned 0 records. Check Airtable permissions.`);
  }
  if (prRecord.PR === undefined || prRecord.PR === null) {
    throw new Error(`❌ PR field missing in record. Available keys: ${Object.keys(prRecord).join(', ')}`);
  }
  if (!commercialConditionsRecord) {
    throw new Error(`❌ Commercial_Conditions table returned 0 records.`);
  }
  if (commercialConditionsRecord.MXN_USD === undefined || commercialConditionsRecord.MXN_USD === null) {
    throw new Error(`❌ MXN_USD missing. Keys: ${Object.keys(commercialConditionsRecord).join(', ')}`);
  }
  if (commercialConditionsRecord.Profit_Margin === undefined || commercialConditionsRecord.Profit_Margin === null) {
    throw new Error(`❌ Profit_Margin missing`);
  }

  console.log("✅ Params validated successfully");

  paramsCache = {
    tarifa1: latestTarifa1,
    tarifaPDBT: latestTarifaPDBT,
    tarifaDAC: latestTarifaDAC,
    hsp: hsp,
    pr: prRecord.PR,
    spaceMultiplier: spaceMultiplierRecord?.Space_Multiplier,
    metersPerFloor: metersPerFloorRecord?.Meters_per_floor,
    oversizingFactor: oversizingFactorRecord?.Oversizing_factor,
    evSpecs: evSpecs,
    acConsumption: acConsumptionRecord?.["kWh/h"],
    secadoraConsumption: secadoraConsumptionRecord?.["kWh/h"],
    otherLoads: otherLoads,
    commercialConditions: {
      MXN_USD: commercialConditionsRecord.MXN_USD,
      Profit_Margin: commercialConditionsRecord.Profit_Margin,
      Discount_Rate: commercialConditionsRecord.Discount_Rate,
      Insurance_Rate: commercialConditionsRecord.Insurance_Rate,
      Extraordinarios: commercialConditionsRecord.Extraordinarios,
      CAC_MXN: commercialConditionsRecord.CAC_MXN,
      Secuencia_Exhibiciones: commercialConditionsRecord.Secuencia_Exhibiciones
    },
    panelSpecs: panelSpecs,
    microinverterSpecs: microinverterSpecs,
    microExtras: microExtras,
    dtuSpecs: dtuSpecs,
    inverterSpecs: inverterSpecs,
    montajeSpecs: montajeSpecs,
    deliveryCosts: deliveryCostsRecord?.Percentage,
    businessLoadsGuess: businessLoadsGuess,
    houseLoadsGuess: houseLoadsGuess,
    environmentalImpact
  };

  cacheTimestamp = now;
  console.log("✅ Params cached successfully");

  return paramsCache;
}

export function getHSPForMunicipio(estado, params) {
  // Function name kept for backwards compatibility but now uses Estado
  const normalize = value => value?.toString().trim().toLowerCase();

  // Try exact match first
  let hspRecord = params.hsp.find(h => h.Estado === estado);

  // Fallback to case-insensitive/trimmed comparison if exact match is not found
  if (!hspRecord) {
    const target = normalize(estado);
    hspRecord = params.hsp.find(h => normalize(h.Estado) === target);
  }

  // If still not found, fallback to Ciudad de México (legacy default) or the first available record
  if (!hspRecord?.HSP) {
    const defaultRecord =
      params.hsp.find(h => normalize(h.Estado) === normalize("Ciudad de México")) || params.hsp[0];

    if (!defaultRecord?.HSP) {
      throw new Error(
        `❌ HSP not found for estado: ${estado}. Available estados: ${params.hsp
          .map(h => h.Estado)
          .join(', ')}`
      );
    }

    console.warn(
      `⚠️ HSP not found for estado: ${estado}. Falling back to ${defaultRecord.Estado} (HSP=${defaultRecord.HSP}).`
    );
    hspRecord = defaultRecord;
  }

  return hspRecord.HSP;
}

export function getBombaConsumption(params) {
  const bomba = params.otherLoads.find(l => l.Load_type === "Bomba de agua");
  if (!bomba?.Daily_Consumption_kWh) {
    throw new Error("❌ Bomba consumption not found in Airtable");
  }
  return bomba.Daily_Consumption_kWh;
}

export function getOtroConsumption(params) {
  const otro = params.otherLoads.find(l => l.Load_type === "Otro");
  if (!otro?.Daily_Consumption_kWh) {
    throw new Error("❌ Otro consumption not found in Airtable");
  }
  return otro.Daily_Consumption_kWh;
}

export function getEVConsumption(modelo, params) {
  const ev = findEvSpecBySelection(modelo, params.evSpecs);
  if (!ev?.["kWh/100km"]) {
    throw new Error(`❌ EV consumption not found for model: ${modelo}`);
  }
  return ev["kWh/100km"];
}
