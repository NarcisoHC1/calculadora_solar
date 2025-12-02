// netlify/functions/lib/airtable.mjs
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

  // OCR or Manual
  if (data.ocr_manual) fields["OCR_Manual"] = data.ocr_manual;
  if (data.ocr_json) fields["OCR_JSON"] = data.ocr_json;

  // Location
  if (data.estado) fields["Estado"] = data.estado;

  // CFE Info
  if (data.tiene_contrato_cfe !== undefined) fields["Tiene_Contrato_CFE"] = data.tiene_contrato_cfe ? "sí" : "no";
  if (data.tiene_recibo_cfe !== undefined) fields["Tiene_recibo_CFE"] = data.tiene_recibo_cfe ? "sí" : "no";
  if (data.no_servicio_cfe) fields["No_de_servicio_CFE"] = data.no_servicio_cfe;
  if (data.no_medidor_cfe) fields["No_de_medidor_CFE"] = data.no_medidor_cfe;
  if (data.Numero_Servicio_CFE) fields["Numero_Servicio_CFE"] = data.Numero_Servicio_CFE;
  if (data.Numero_Medidor_CFE) fields["Numero_Medidor_CFE"] = data.Numero_Medidor_CFE;
  if (data.Fases !== undefined && data.Fases !== null && data.Fases !== "") fields["Fases"] = data.Fases;

  // Consumption & Payment
  if (data.pago_promedio) fields["Pago_Prom_MXN_Periodo"] = Math.round(data.pago_promedio);
  if (data.Pago_Prom_MXN_Periodo) fields["Pago_Prom_MXN_Periodo"] = Math.round(data.Pago_Prom_MXN_Periodo);
  if (data.periodicidad) fields["Periodicidad"] = data.periodicidad;
  if (data.Periodicidad) fields["Periodicidad"] = data.Periodicidad;
  if (data.tarifa) fields["Tarifa"] = data.tarifa;
  if (data.Tarifa) fields["Tarifa"] = data.Tarifa;
  if (data.kwh_consumidos) fields["kWh_consumidos"] = Math.round(data.kwh_consumidos);
  if (data.kWh_consumidos) fields["kWh_consumidos"] = Math.round(data.kWh_consumidos);
  if (data.kwh_consumidos_y_cargas_extra) fields["kWh_consumidos_y_cargas_extra"] = Math.round(data.kwh_consumidos_y_cargas_extra);

  // Hypothetical payments
  if (data.pago_hipotetico_cargas_extra) fields["Pago_Prom_MXN_Hipotetico_Cargas_Extra"] = Math.round(data.pago_hipotetico_cargas_extra);
  if (data.pago_dac_hipotetico_consumo_actual) fields["Pago_DAC_Hipotetico_Consumo_Actual"] = Math.round(data.pago_dac_hipotetico_consumo_actual);
  if (data.pago_dac_hipotetico_cargas_extra) fields["Pago_DAC_Hipotetico_Cargas_Extra"] = Math.round(data.pago_dac_hipotetico_cargas_extra);

  // Property info
  if (data.quiere_aislado !== undefined) fields["Quiere_Sistema_Aislado"] = data.quiere_aislado ? "sí" : "no";
  if (data.casa_negocio) fields["Casa_Negocio"] = data.casa_negocio;
  if (data.numero_personas !== undefined && data.numero_personas !== null && data.numero_personas !== "") {
    fields["Numero_Personas_Inmueble"] = String(data.numero_personas);
  }
  if (data.ya_tiene_fv !== undefined) fields["Ya_Tiene_FV"] = data.ya_tiene_fv ? "sí" : "no";
  if (data.tipo_inmueble) fields["Tipo_Inmueble"] = data.tipo_inmueble;
  if (data.metros_distancia) fields["Metros_distancia"] = data.metros_distancia;

  // Loads
  if (data.modelo_ev) fields["Modelo_EV"] = data.modelo_ev;
  if (data.km_ev) fields["Km_EV"] = data.km_ev;
  if (data.no_minisplits) fields["No_minisplits"] = data.no_minisplits;
  if (data.horas_minisplit) fields["Horas_minisplit"] = data.horas_minisplit;
  if (data.horas_secadora) fields["Horas_secadora"] = data.horas_secadora;
  if (data.bomba_agua !== undefined) fields["Bomba_agua"] = data.bomba_agua ? "sí" : "no";
  if (data.otro !== undefined) fields["Otro"] = data.otro ? "sí" : "no";

  // Notes
  if (data.texto_libre) fields["Texto_Libre"] = data.texto_libre;

  // UTMs and tracking
  if (data.ref) fields["ref"] = data.ref;
  if (data.utm_source) fields["utm_source"] = data.utm_source;
  if (data.utm_medium) fields["utm_medium"] = data.utm_medium;
  if (data.utm_campaign) fields["utm_campaign"] = data.utm_campaign;
  if (data.utm_term) fields["utm_term"] = data.utm_term;
  if (data.utm_content) fields["utm_content"] = data.utm_content;
  if (data.gclid) fields["gclid"] = data.gclid;
  if (data.fbclid) fields["fbclid"] = data.fbclid;
  if (data.wbraid) fields["wbraid"] = data.wbraid;
  if (data.gbraid) fields["gbraid"] = data.gbraid;
  if (data.ttclid) fields["ttclid"] = data.ttclid;
  if (data.li_fat_id) fields["li_fat_id"] = data.li_fat_id;
  if (data.twclid) fields["twclid"] = data.twclid;
  if (data.propuesta_auto !== undefined) fields["Propuesta_Auto"] = data.propuesta_auto ? "sí" : "no";
  if (data.OCR_JSON) fields["OCR_JSON"] = data.OCR_JSON;
  if (data.ocr_json) fields["OCR_JSON"] = data.ocr_json;
  if (data.OCR_Manual) fields["OCR_Manual"] = data.OCR_Manual;
  if (data.Imagen_recibo) fields["Imagen_recibo"] = data.Imagen_recibo;

  const rec = await createRecord("Submission_Details", fields);
  return rec.id;
}

// Crear Proposal (con TODOS los campos del schema)
export async function createProposal({ projectId, proposalData, proposalCargasExtra }) {
  const fields = {
    "Project_Id": [projectId],
    "Created_by": "auto",
    "Proposal_type": "prelim"
  };

  const computeUsdPerW = (subtotal, tc, potencia, cantidad) => {
    if (!subtotal || !tc || !potencia || !cantidad) return null;
    const usdW = (subtotal / tc) / (potencia * cantidad);
    return Number.isFinite(usdW) ? usdW : null;
  };

  // Consumo base
  if (proposalData.kwh_consumidos) fields["kWh_consumidos"] = Math.round(proposalData.kwh_consumidos);
  if (proposalData.kwh_consumidos_y_cargas_extra) fields["kWh_consumidos_y_cargas_extra"] = Math.round(proposalData.kwh_consumidos_y_cargas_extra);

  // Sistema actual
  if (proposalData.id_panel) fields["ID_Panel"] = proposalData.id_panel;
  if (proposalData.potencia_panel) fields["Potencia_Panel"] = proposalData.potencia_panel;
  if (proposalData.cantidad_paneles) fields["Cantidad_Paneles"] = proposalData.cantidad_paneles;
  if (proposalData.area_needed) fields["Area_needed"] = Math.round(proposalData.area_needed);
  if (proposalData.micro_central) fields["Micro_Central"] = proposalData.micro_central;

  // Inversor central (si aplica)
  if (proposalData.id_inversor) fields["ID_Inversor"] = proposalData.id_inversor;
  if (proposalData.costo_inversor) fields["Costo_Inversor"] = Math.round(proposalData.costo_inversor);

  // Microinversores (si aplica)
  if (proposalData.id_micro_2_panel) fields["ID_Micro_2_Panel"] = proposalData.id_micro_2_panel;
  if (proposalData.cantidad_micro_2_panel) fields["Cantidad_Micro_2_Panel"] = proposalData.cantidad_micro_2_panel;
  if (proposalData.id_micro_4_panel) fields["ID_Micro_4_Panel"] = proposalData.id_micro_4_panel;
  if (proposalData.cantidad_micro_4_panel) fields["Cantidad_Micro_4_Panel"] = proposalData.cantidad_micro_4_panel;
  if (proposalData.costo_microinversores) fields["Costo_Microinversores"] = Math.round(proposalData.costo_microinversores);
  if (proposalData.costo_extras_microinversores) fields["Costo_Extras_Microniversores"] = Math.round(proposalData.costo_extras_microinversores);

  // Montaje
  if (proposalData.id_montaje_a) fields["ID_Montaje_A"] = proposalData.id_montaje_a;
  if (proposalData.cantidad_montaje_a) fields["Cantidad_Montaje_A"] = proposalData.cantidad_montaje_a;
  if (proposalData.id_montaje_b) fields["ID_Montaje_B"] = proposalData.id_montaje_b;
  if (proposalData.cantidad_montaje_b) fields["Cantidad_Montaje_B"] = proposalData.cantidad_montaje_b;
  if (proposalData.costo_montaje) fields["Costo_Montaje"] = Math.round(proposalData.costo_montaje);

  // Otros costos
  if (proposalData.costo_paneles) fields["Costo_Paneles"] = Math.round(proposalData.costo_paneles);
  if (proposalData.costo_bos) fields["Costo_BOS"] = Math.round(proposalData.costo_bos);
  if (proposalData.costo_transporte_incl_seguro) fields["Costo_Transporte_Incl_Seguro"] = Math.round(proposalData.costo_transporte_incl_seguro);
  if (proposalData.costo_mo) fields["Costo_MO"] = Math.round(proposalData.costo_mo);
  if (proposalData.costo_seguro_rc) fields["Costo_Seguro_RC"] = Math.round(proposalData.costo_seguro_rc);
  if (proposalData.costos_extraordinarios) fields["Costos_Extraordinarios"] = Math.round(proposalData.costos_extraordinarios);
  if (proposalData.costos_viaticos !== undefined) fields["Costos_Viaticos"] = Math.round(proposalData.costos_viaticos);

  // Totales
  if (proposalData.costos_totales) fields["Costos_Totales"] = Math.round(proposalData.costos_totales);
  const profitMargin = proposalData.profit_margin ?? proposalCargasExtra?.profit_margin;
  const discountRate = proposalData.discount_rate ?? proposalCargasExtra?.discount_rate;
  if (profitMargin !== undefined) fields["Profit_margin"] = profitMargin;
  if (discountRate !== undefined) fields["Discount_rate"] = discountRate;
  if (proposalData.tc) fields["TC"] = proposalData.tc;
  if (proposalData.precio_lista) fields["Precio_lista"] = Math.round(proposalData.precio_lista);
  if (proposalData.subtotal) fields["Subtotal"] = Math.round(proposalData.subtotal);
  if (proposalData.iva) fields["IVA"] = Math.round(proposalData.iva);
  if (proposalData.total) fields["Total"] = Math.round(proposalData.total);
  const usdPerW = computeUsdPerW(proposalData.subtotal, proposalData.tc, proposalData.potencia_panel, proposalData.cantidad_paneles);
  if (usdPerW) fields["USD_W"] = usdPerW;
  if (proposalData.gross_profit) fields["Gross_profit"] = Math.round(proposalData.gross_profit);
  if (proposalData.gross_profit_post_cac) fields["Gross_profit_post_CAC"] = Math.round(proposalData.gross_profit_post_cac);
  if (proposalData.secuencia_exhibiciones) fields["Secuencia_Exhibiciones"] = proposalData.secuencia_exhibiciones;
  if (proposalData.impacto_ambiental) {
    if (proposalData.impacto_ambiental.carbon !== undefined) fields["Carbon"] = Math.round(proposalData.impacto_ambiental.carbon);
    if (proposalData.impacto_ambiental.trees !== undefined) fields["Trees"] = Math.round(proposalData.impacto_ambiental.trees);
    if (proposalData.impacto_ambiental.oil !== undefined) fields["Oil_Barrels"] = Math.round(proposalData.impacto_ambiental.oil);
  }

  // === PROPUESTA CON CARGAS EXTRA (si existe) ===
  if (proposalCargasExtra) {
    if (proposalCargasExtra.potencia_panel) fields["Potencia_Panel_Cargas_Extra"] = proposalCargasExtra.potencia_panel;
    if (proposalCargasExtra.cantidad_paneles) fields["Cantidad_Paneles_Cargas_Extra"] = proposalCargasExtra.cantidad_paneles;
    if (proposalCargasExtra.area_needed) fields["Area_needed_Cargas_Extra"] = Math.round(proposalCargasExtra.area_needed);
    if (proposalCargasExtra.costo_paneles) fields["Costo_Paneles_Cargas_Extra"] = Math.round(proposalCargasExtra.costo_paneles);
    if (proposalCargasExtra.micro_central) fields["Micro_Central_Cargas_Extra"] = proposalCargasExtra.micro_central;

    if (proposalCargasExtra.id_inversor) fields["ID_Inversor_Cargas_Extra"] = proposalCargasExtra.id_inversor;
    if (proposalCargasExtra.costo_inversor) fields["Costo_Inversor_Cargas_Extra"] = Math.round(proposalCargasExtra.costo_inversor);

    if (proposalCargasExtra.id_micro_2_panel) fields["ID_Micro_2_Panel_Cargas_Extra"] = proposalCargasExtra.id_micro_2_panel;
    if (proposalCargasExtra.cantidad_micro_2_panel) fields["Cantidad_Micro_2_Panel_Cargas_Extra"] = proposalCargasExtra.cantidad_micro_2_panel;
    if (proposalCargasExtra.id_micro_4_panel) fields["ID_Micro_4_Panel_Cargas_Extra"] = proposalCargasExtra.id_micro_4_panel;
    if (proposalCargasExtra.cantidad_micro_4_panel) fields["Cantidad_Micro_4_Panel_Cargas_Extra"] = proposalCargasExtra.cantidad_micro_4_panel;
    if (proposalCargasExtra.costo_microinversores) fields["Costo_Microinversores_Cargas_Extra"] = Math.round(proposalCargasExtra.costo_microinversores);
    if (proposalCargasExtra.costo_extras_microinversores) fields["Costo_Extras_Microinversores_Cargas_Extra"] = Math.round(proposalCargasExtra.costo_extras_microinversores);

    if (proposalCargasExtra.id_montaje_a) fields["ID_Montaje_A_Cargas_Extra"] = proposalCargasExtra.id_montaje_a;
    if (proposalCargasExtra.cantidad_montaje_a) fields["Cantidad_Montaje_A_Cargas_Extra"] = proposalCargasExtra.cantidad_montaje_a;
    if (proposalCargasExtra.id_montaje_b) fields["ID_Montaje_B_Cargas_Extra"] = proposalCargasExtra.id_montaje_b;
    if (proposalCargasExtra.cantidad_montaje_b) fields["Cantidad_Montaje_B_Cargas_Extra"] = proposalCargasExtra.cantidad_montaje_b;
    if (proposalCargasExtra.costo_montaje) fields["Costo_Montaje_Cargas_Extra"] = Math.round(proposalCargasExtra.costo_montaje);
    if (proposalCargasExtra.costo_bos) fields["Costo_BOS_Cargas_Extra"] = Math.round(proposalCargasExtra.costo_bos);

    if (proposalCargasExtra.costo_transporte_incl_seguro) fields["Costo_Transporte_Incl_Seguro_Cargas_Extra"] = Math.round(proposalCargasExtra.costo_transporte_incl_seguro);
    if (proposalCargasExtra.costo_mo) fields["Costo_MO_Cargas_Extra"] = Math.round(proposalCargasExtra.costo_mo);
    if (proposalCargasExtra.costo_seguro_rc) fields["Costo_Seguro_RC_Cargas_Extra"] = Math.round(proposalCargasExtra.costo_seguro_rc);

    if (proposalCargasExtra.costos_totales) fields["Costos_Totales_Cargas_Extra"] = Math.round(proposalCargasExtra.costos_totales);
    if (proposalCargasExtra.precio_lista) fields["Precio_lista_Cargas_Extra"] = Math.round(proposalCargasExtra.precio_lista);
    if (proposalCargasExtra.subtotal) fields["Subtotal_Cargas_Extra"] = Math.round(proposalCargasExtra.subtotal);
    if (proposalCargasExtra.iva) fields["IVA_Cargas_Extra"] = Math.round(proposalCargasExtra.iva);
    if (proposalCargasExtra.total) fields["Total_Cargas_Extra"] = Math.round(proposalCargasExtra.total);
    const usdPerWCargasExtra = computeUsdPerW(
      proposalCargasExtra.subtotal,
      proposalCargasExtra.tc,
      proposalCargasExtra.potencia_panel,
      proposalCargasExtra.cantidad_paneles
    );
    if (usdPerWCargasExtra) fields["USD_W_Cargas_Extra"] = usdPerWCargasExtra;
    if (proposalCargasExtra.gross_profit) fields["Gross_profit_Cargas_Extra"] = Math.round(proposalCargasExtra.gross_profit);
    if (proposalCargasExtra.gross_profit_post_cac) fields["Gross_profit_post_CAC_Cargas_Extra"] = Math.round(proposalCargasExtra.gross_profit_post_cac);
    if (proposalCargasExtra.impacto_ambiental) {
      if (proposalCargasExtra.impacto_ambiental.carbon !== undefined) fields["Carbon_Cargas_Extra"] = Math.round(proposalCargasExtra.impacto_ambiental.carbon);
      if (proposalCargasExtra.impacto_ambiental.trees !== undefined) fields["Trees_Cargas_Extra"] = Math.round(proposalCargasExtra.impacto_ambiental.trees);
      if (proposalCargasExtra.impacto_ambiental.oil !== undefined) fields["Oil_Barrels_Cargas_Extra"] = Math.round(proposalCargasExtra.impacto_ambiental.oil);
    }
  }

  const rec = await createRecord("Proposals", fields);
  return rec.id;
}
