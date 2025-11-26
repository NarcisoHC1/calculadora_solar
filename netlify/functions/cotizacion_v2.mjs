// netlify/functions/cotizacion_v2.mjs
import { CORS, upsertLead, createProject, createSubmissionDetails, createProposal } from "./lib/airtable.mjs";
import { generateCompleteProposal } from "./lib/proposalEngine.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    if (!body.nombre || !body.email || !body.telefono) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ ok: false, error: "Faltan datos de contacto" })
      };
    }

    console.log("📥 Recibiendo cotización:", body);

    const leadId = await upsertLead({
      nombre: body.nombre,
      email: body.email,
      telefono: body.telefono,
      direccion: ""
    });
    console.log("✅ Lead:", leadId);

    const projectId = await createProject({ leadId });
    console.log("✅ Project:", projectId);

    // Generar propuesta completa usando el nuevo motor
    const formDataForEngine = {
      // Basic info
      estado: body.estado || "",
      municipio: body.municipio || "Ciudad de México",
      has_cfe: body.has_cfe,
      tiene_recibo: body.tiene_recibo,
      pago_promedio: Number(body.pago_promedio_mxn || 0),
      periodicidad: body.periodicidad || "bimestral",
      tarifa: body.tarifa || "",
      kwh_consumidos: body.kwh_consumidos || null,

      // Property
      uso: body.uso || "Casa",
      casa_negocio: body.uso || "Casa",
      numero_personas: Number(body.numero_personas || 0),
      rango_personas_negocio: body.rango_personas_negocio || "",
      tipo_inmueble: body.tipo_inmueble || "",
      pisos: Number(body.pisos || 0),
      distancia_techo_tablero: Number(body.distancia_techo_tablero || 0),

      // Loads
      loads: {
        ev: body.loads?.ev || null,
        minisplit: body.loads?.minisplit || null,
        secadora: body.loads?.secadora || null,
        bomba: body.loads?.bomba || false,
        otro: body.loads?.otro || false
      },

      // Planning flags
      plans_cfe: body.plans_cfe,
      ya_tiene_fv: body.ya_tiene_fv
    };

    const proposal = await generateCompleteProposal(formDataForEngine);
    console.log("🧮 Propuesta completa calculada");

    // Determine field values with proper logic
    const hasCFE = body.has_cfe !== false;
    const tieneReciboCFE = hasCFE && body.tiene_recibo !== false;
    const quiereAislado = body.plans_cfe === "aislado";
    const yaTieneFV = body.ya_tiene_fv === true || body.ya_tiene_fv === "si";

    // Determine casa_negocio - only set if explicitly asked
    const casaNegocio = body.uso ? body.uso : "";

    // Map tipo_inmueble to correct values
    const tipoInmuebleMap = {
      "Casa o negocio independiente de 1-2 pisos": "casa",
      "1": "casa",
      "Departamento/local en edificio / condominio vertical": "depto",
      "2": "depto",
      "Sólo áreas comunes de condominio / fraccionamiento": "comunes-condominio",
      "3": "comunes-condominio",
      "Sólo áreas comunes de edificio vertical": "comunes-edificio",
      "4": "comunes-edificio",
      "Local en plaza comercial o edificio": "comercio-en-edificio",
      "5": "comercio-en-edificio",
      "Conjunto habitacional vertical / condominio vertical": "condo-vertical",
      "6": "condo-vertical",
      "Conjunto habitacional horizontal / condominio horizontal": "condo-horizontal",
      "7": "condo-horizontal",
      "Nave industrial / bodega": "nave-industrial-o-bodega",
      "8": "nave-industrial-o-bodega",
      "Edificios enteros (hoteles, oficinas, públicos)": "edificio-entero",
      "9": "edificio-entero"
    };
    const tipoInmuebleMapped = tipoInmuebleMap[body.tipo_inmueble] || body.tipo_inmueble || "";

    // Check if tarifa is residential (1, 1A, 1B, 1C, 1D, 1E, 1F, DAC)
    const tarifaResidencial = /^(1[A-F]?|DAC)$/i.test(proposal.tarifa || body.tarifa || "");

    // Preparar datos para Submission_Details
    const submissionData = {
      ocr_manual: body.ocr_result ? "OCR" : "manual",
      ocr_json: body.ocr_result ? JSON.stringify(body.ocr_result) : null,
      estado: body.estado || "",
      tiene_contrato_cfe: hasCFE,
      tiene_recibo_cfe: tieneReciboCFE,
      no_servicio_cfe: body.ocr_result?.no_servicio || "",
      no_medidor_cfe: body.ocr_result?.no_medidor || "",
      pago_promedio: Number(body.pago_promedio_mxn || 0),
      periodicidad: body.periodicidad || "bimestral",
      tarifa: proposal.tarifa || body.tarifa || "",
      kwh_consumidos: proposal.kwh_consumidos,
      kwh_consumidos_y_cargas_extra: proposal.kwh_consumidos_y_cargas_extra,
      pago_hipotetico_cargas_extra: proposal.pago_hipotetico_cargas_extra,
      pago_dac_hipotetico_consumo_actual: tarifaResidencial ? proposal.pago_dac_hipotetico_consumo_actual : null,
      pago_dac_hipotetico_cargas_extra: tarifaResidencial ? proposal.pago_dac_hipotetico_cargas_extra : null,
      quiere_aislado: quiereAislado ? "sí" : "no",
      casa_negocio: casaNegocio,
      numero_personas: Number(body.numero_personas || 0),
      ya_tiene_fv: yaTieneFV ? "sí" : "no",
      tipo_inmueble: tipoInmuebleMapped,
      metros_distancia: proposal.metros_distancia,
      modelo_ev: body.loads?.ev?.modelo || "",
      km_ev: Number(body.loads?.ev?.km || 0),
      no_minisplits: Number(body.loads?.minisplit?.cantidad || 0),
      horas_minisplit: Number(body.loads?.minisplit?.horas || 0),
      horas_secadora: Number(body.loads?.secadora?.horas || 0),
      bomba_agua: body.loads?.bomba ? "sí" : "no",
      otro: body.loads?.otro ? "sí" : "no",
      texto_libre: body.notes || "",
      ref: body.utms?.ref || "",
      utm_source: body.utms?.utm_source || "",
      utm_medium: body.utms?.utm_medium || "",
      utm_campaign: body.utms?.utm_campaign || "",
      utm_term: body.utms?.utm_term || "",
      utm_content: body.utms?.utm_content || "",
      gclid: body.utms?.gclid || "",
      fbclid: body.utms?.fbclid || "",
      wbraid: body.utms?.wbraid || "",
      gbraid: body.utms?.gbraid || "",
      ttclid: body.utms?.ttclid || "",
      li_fat_id: body.utms?.li_fat_id || "",
      twclid: body.utms?.twclid || ""
    };

    const submissionId = await createSubmissionDetails({
      projectId,
      data: submissionData
    });
    console.log("✅ Submission_Details:", submissionId);

    const proposalId = await createProposal({
      projectId,
      proposalData: { ...proposal.propuesta_actual, kwh_consumidos: proposal.kwh_consumidos, kwh_consumidos_y_cargas_extra: proposal.kwh_consumidos_y_cargas_extra },
      proposalCargasExtra: proposal.propuesta_cargas_extra
    });
    console.log("✅ Proposal:", proposalId);

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        project_id: projectId,
        proposal_id: proposalId,
        proposal: {
          kwh_consumidos: proposal.kwh_consumidos,
          kwh_consumidos_y_cargas_extra: proposal.kwh_consumidos_y_cargas_extra,
          metros_distancia: proposal.metros_distancia,
          propuesta_actual: proposal.propuesta_actual,
          propuesta_cargas_extra: proposal.propuesta_cargas_extra,
          pago_dac_hipotetico_consumo_actual: proposal.pago_dac_hipotetico_consumo_actual,
          pago_dac_hipotetico_cargas_extra: proposal.pago_dac_hipotetico_cargas_extra
        }
      })
    };

  } catch (error) {
    console.error("❌ Error:", error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({
        ok: false,
        error: error.message || "Error interno"
      })
    };
  }
}
