// netlify/functions/lib/params.js
// Fetches and caches parameters from Airtable Params database

const PARAMS_BASE_ID = process.env.AIRTABLE_PARAMS_BASE || "appjBih1L25LKSgPJ";
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

let paramsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchTable(tableName) {
  const url = `https://api.airtable.com/v0/${PARAMS_BASE_ID}/${encodeURIComponent(tableName)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${tableName}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.records.map(r => r.fields);
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
    houseLoadsGuess
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
    fetchTable("House_Loads_Guess")
  ]);

  // Get latest tarifa records (most recent by year/month)
  const latestTarifa1 = tarifa1.sort((a, b) => b.Ano - a.Ano || b.Mes - a.Mes)[0];
  const latestTarifaPDBT = tarifaPDBT.sort((a, b) => b.Ano - a.Ano || b.Mes - a.Mes)[0];
  const latestTarifaDAC = tarifaDAC.sort((a, b) => b.Ano - a.Ano || b.Mes - a.Mes)[0];

  if (!latestTarifa1 || !latestTarifaPDBT || !latestTarifaDAC) {
    throw new Error("❌ Missing tarifa data in Airtable Params");
  }

  // Get versioned parameters - only take first record (as per user: only row 1 has values)
  const prRecord = pr[0];
  const spaceMultiplierRecord = spaceMultiplier[0];
  const metersPerFloorRecord = metersPerFloor[0];
  const oversizingFactorRecord = oversizingFactor[0];
  const acConsumptionRecord = acConsumption[0];
  const secadoraConsumptionRecord = secadoraConsumption[0];
  const deliveryCostsRecord = deliveryCosts[0];
  const commercialConditionsRecord = commercialConditions[0];

  // Validate critical params exist
  if (!prRecord?.PR) {
    throw new Error("❌ Missing PR parameter in Airtable");
  }
  if (!commercialConditionsRecord) {
    throw new Error("❌ Missing Commercial_Conditions in Airtable");
  }
  if (!commercialConditionsRecord.MXN_USD) {
    throw new Error("❌ Missing MXN_USD in Commercial_Conditions");
  }
  if (!commercialConditionsRecord.Profit_Margin) {
    throw new Error("❌ Missing Profit_Margin in Commercial_Conditions");
  }

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
    houseLoadsGuess: houseLoadsGuess
  };

  cacheTimestamp = now;
  console.log("✅ Params cached successfully");

  return paramsCache;
}

export function getHSPForMunicipio(municipio, params) {
  const hspRecord = params.hsp.find(h => h.Municipio === municipio);
  if (!hspRecord?.HSP) {
    throw new Error(`❌ HSP not found for municipio: ${municipio}`);
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
  const ev = params.evSpecs.find(e => e.Model === modelo);
  if (!ev?.["kWh/100km"]) {
    throw new Error(`❌ EV consumption not found for model: ${modelo}`);
  }
  return ev["kWh/100km"];
}
