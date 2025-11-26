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

  paramsCache = {
    tarifa1: tarifa1.sort((a, b) => b.Ano - a.Ano || b.Mes - a.Mes)[0],
    tarifaPDBT: tarifaPDBT.sort((a, b) => b.Ano - a.Ano || b.Mes - a.Mes)[0],
    tarifaDAC: tarifaDAC.sort((a, b) => b.Ano - a.Ano || b.Mes - a.Mes)[0],
    hsp: hsp,
    pr: pr.find(p => p.Version === "v1")?.PR || 0.835,
    spaceMultiplier: spaceMultiplier.find(p => p.Version === "v1")?.Space_Multiplier || 1.3,
    metersPerFloor: metersPerFloor.find(p => p.Version === "v1")?.Meters_per_floor || 3.0,
    oversizingFactor: oversizingFactor.find(p => p.Version === "v1")?.Oversizing_factor || 1.2,
    evSpecs: evSpecs,
    acConsumption: acConsumption.find(p => p.Version === "v1")?.["kWh/h"] || 1.5,
    secadoraConsumption: secadoraConsumption.find(p => p.Version === "v1")?.["kWh/h"] || 2.5,
    otherLoads: otherLoads,
    commercialConditions: commercialConditions.find(c => c.Parameter_Version === "v1"),
    panelSpecs: panelSpecs,
    microinverterSpecs: microinverterSpecs,
    microExtras: microExtras,
    dtuSpecs: dtuSpecs,
    inverterSpecs: inverterSpecs,
    montajeSpecs: montajeSpecs,
    deliveryCosts: deliveryCosts.find(d => d.Version === "v1")?.Percentage || 0.08,
    businessLoadsGuess: businessLoadsGuess,
    houseLoadsGuess: houseLoadsGuess
  };

  cacheTimestamp = now;
  console.log("✅ Params cached successfully");

  return paramsCache;
}

export function getHSPForMunicipio(municipio, params) {
  const hspRecord = params.hsp.find(h => h.Municipio === municipio);
  return hspRecord?.HSP || 5.5; // Default fallback
}

export function getBombaConsumption(params) {
  const bomba = params.otherLoads.find(l => l.Load_type === "Bomba de agua");
  return bomba?.Daily_Consumption_kWh || 1.5;
}

export function getOtroConsumption(params) {
  const otro = params.otherLoads.find(l => l.Load_type === "Otro");
  return otro?.Daily_Consumption_kWh || 2.0;
}

export function getEVConsumption(modelo, params) {
  const ev = params.evSpecs.find(e => e.Model === modelo);
  return ev?.["kWh/100km"] || 18; // Default
}
