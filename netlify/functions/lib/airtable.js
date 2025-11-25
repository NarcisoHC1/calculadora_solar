// netlify/functions/lib/airtable.js
// Módulo de conexión y operaciones básicas con Airtable

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_CRM = process.env.AIRTABLE_BASE;

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const API = `https://api.airtable.com/v0/${AIRTABLE_BASE_CRM}/`;
const HEAD = {
  Authorization: `Bearer ${AIRTABLE_TOKEN}`,
  "Content-Type": "application/json"
};

export const esc = (s) => String(s || "").replace(/'/g, "\\'");

// Query records con filtro
export async function queryRecords(table, formula = "") {
  const url = API + encodeURIComponent(table) + (formula ? `?filterByFormula=${encodeURIComponent(formula)}` : "");
  const res = await fetch(url, { headers: HEAD });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Airtable query ${table}: ${json.error?.message || res.statusText}`);
  }
  return json.records || [];
}

// Crear registro
export async function createRecord(table, fields) {
  const res = await fetch(API + encodeURIComponent(table), {
    method: "POST",
    headers: HEAD,
    body: JSON.stringify({ fields })
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Airtable create ${table}: ${json.error?.message || res.statusText}`);
  }
  return json;
}

// Actualizar registro
export async function updateRecord(table, id, fields) {
  const res = await fetch(API + encodeURIComponent(table) + "/" + id, {
    method: "PATCH",
    headers: HEAD,
    body: JSON.stringify({ fields })
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Airtable update ${table}: ${json.error?.message || res.statusText}`);
  }
  return json;
}

// ===== OPERACIONES ESPECÍFICAS =====

// Upsert Lead (buscar o crear)
export async function upsertLead({ nombre, email, telefono, direccion = "" }) {
  const filter = `OR({Email}='${esc(email)}',{Telefono}='${esc(telefono)}')`;
  const found = (await queryRecords("Leads_", filter))[0];

  if (found) {
    const f = found.fields || {};
    const needs = {};
    if (nombre && !f["Nombre"]) needs["Nombre"] = nombre;
    if (telefono && !f["Telefono"]) needs["Telefono"] = telefono;
    if (direccion && !f["Dirección"]) needs["Dirección"] = direccion;
    if (Object.keys(needs).length) {
      await updateRecord("Leads_", found.id, needs);
    }
    return found.id;
  }

  const created = await createRecord("Leads_", {
    "Nombre": nombre || "",
    "Email": email || "",
    "Telefono": telefono || "",
    "Dirección": direccion || ""
  });
  return created.id;
}

// Crear Project
export async function createProject({ leadId }) {
  const rec = await createRecord("Projects", {
    "Contact_Id": [leadId]
  });
  return rec.id;
}

// Crear Submission_Details
export async function createSubmissionDetails({ projectId, data }) {
  const fields = { "Project_Id": [projectId] };

  if (data.estado) fields["Estado"] = data.estado;
  if (data.tiene_contrato_cfe !== undefined) fields["Tiene_Contrato_CFE"] = data.tiene_contrato_cfe ? "sí" : "no";
  if (data.tiene_recibo_cfe !== undefined) fields["Tiene_recibo_CFE"] = data.tiene_recibo_cfe ? "sí" : "no";
  if (data.pago_promedio) fields["Pago_Prom_MXN_Periodo"] = Math.round(data.pago_promedio);
  if (data.periodicidad) fields["Periodicidad"] = data.periodicidad;
  if (data.tarifa) fields["Tarifa"] = data.tarifa;
  if (data.kwh_consumidos) fields["kWh_consumidos"] = Math.round(data.kwh_consumidos);
  if (data.kwh_consumidos_y_cargas_extra) fields["kWh_consumidos_y_cargas_extra"] = Math.round(data.kwh_consumidos_y_cargas_extra);
  if (data.casa_negocio) fields["Casa_Negocio"] = data.casa_negocio;
  if (data.numero_personas) fields["Numero_Personas_Inmueble"] = data.numero_personas;
  if (data.quiere_aislado) fields["Quiere_Sistema_Aislado"] = data.quiere_aislado ? "sí" : "no";
  if (data.tipo_inmueble) fields["Tipo_Inmueble"] = data.tipo_inmueble;
  if (data.metros_distancia) fields["Metros_distancia"] = data.metros_distancia;
  if (data.texto_libre) fields["Texto_Libre"] = data.texto_libre;

  if (data.modelo_ev) fields["Modelo_EV"] = data.modelo_ev;
  if (data.km_ev) fields["Km_EV"] = data.km_ev;
  if (data.no_minisplits) fields["No_minisplits"] = data.no_minisplits;
  if (data.horas_minisplit) fields["Horas_minisplit"] = data.horas_minisplit;
  if (data.horas_secadora) fields["Horas_secadora"] = data.horas_secadora;
  if (data.bomba_agua !== undefined) fields["Bomba_agua"] = data.bomba_agua ? "sí" : "no";
  if (data.otro !== undefined) fields["Otro"] = data.otro ? "sí" : "no";

  if (data.ref) fields["ref"] = data.ref;
  if (data.utm_source) fields["utm_source"] = data.utm_source;
  if (data.utm_medium) fields["utm_medium"] = data.utm_medium;
  if (data.utm_campaign) fields["utm_campaign"] = data.utm_campaign;
  if (data.utm_term) fields["utm_term"] = data.utm_term;
  if (data.utm_content) fields["utm_content"] = data.utm_content;
  if (data.gclid) fields["gclid"] = data.gclid;
  if (data.fbclid) fields["fbclid"] = data.fbclid;

  const rec = await createRecord("Submission_Details", fields);
  return rec.id;
}

// Crear Proposal
export async function createProposal({ projectId, proposalData }) {
  const fields = {
    "Project_Id": [projectId],
    "Created_by": "auto",
    "Proposal_type": "prelim"
  };

  if (proposalData.kwh_consumidos) fields["kWh_consumidos"] = Math.round(proposalData.kwh_consumidos);
  if (proposalData.kwh_consumidos_y_cargas_extra) fields["kWh_consumidos_y_cargas_extra"] = Math.round(proposalData.kwh_consumidos_y_cargas_extra);
  if (proposalData.potencia_panel) fields["Potencia_Panel"] = proposalData.potencia_panel;
  if (proposalData.cantidad_paneles) fields["Cantidad_Paneles"] = proposalData.cantidad_paneles;
  if (proposalData.area_needed) fields["Area_needed"] = Math.round(proposalData.area_needed);
  if (proposalData.micro_central) fields["Micro_Central"] = proposalData.micro_central;

  if (proposalData.tc) fields["TC"] = proposalData.tc;
  if (proposalData.profit_margin) fields["Profit_margin"] = proposalData.profit_margin;
  if (proposalData.discount_rate) fields["Discount_rate"] = proposalData.discount_rate;
  if (proposalData.precio_lista) fields["Precio_lista"] = Math.round(proposalData.precio_lista);
  if (proposalData.subtotal) fields["Subtotal"] = Math.round(proposalData.subtotal);
  if (proposalData.iva) fields["IVA"] = Math.round(proposalData.iva);
  if (proposalData.total) fields["Total"] = Math.round(proposalData.total);

  const rec = await createRecord("Proposals", fields);
  return rec.id;
}
