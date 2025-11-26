// netlify/functions/cotizacion_v2.js
import { CORS, upsertLead, createProject, createSubmissionDetails, createProposal } from "./lib/airtable.js";
import { generateCompleteProposal } from "./lib/proposalEngine.js";

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

    // Verificar si tenemos credenciales de Airtable
    if (!process.env.AIRTABLE_TOKEN || !process.env.AIRTABLE_BASE) {
      console.warn("⚠️ No Airtable credentials found - returning mock data");

      const mockProposal = {
        kwh_consumidos: 300,
        kwh_consumidos_y_cargas_extra: 450,
        metros_distancia: 30,
        propuesta_actual: {
          potencia_panel: 555,
          cantidad_paneles: 12,
          kwp: "6.66",
          total: 373364,
          subtotal: 321866,
          iva: 51498,
          precio_lista: 375000
        },
        propuesta_cargas_extra: null
      };

      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({
          ok: true,
          dev_mode: true,
          message: "Using mock data - configure AIRTABLE_TOKEN in Netlify",
          project_id: "mock",
          proposal_id: "mock",
          proposal: mockProposal
        })
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
        bomba: body.cargas?.includes("bomba") || false,
        otro: body.cargas?.includes("otro") || false
      }
    };

    const proposal = await generateCompleteProposal(formDataForEngine);
    console.log("🧮 Propuesta completa calculada");

    // Preparar datos para Submission_Details
    const submissionData = {
      ocr_manual: body.ocr_result ? "OCR" : "manual",
      ocr_json: body.ocr_result ? JSON.stringify(body.ocr_result) : null,
      estado: body.estado || "",
      tiene_contrato_cfe: body.has_cfe !== false,
      tiene_recibo_cfe: body.tiene_recibo !== false,
      no_servicio_cfe: body.ocr_result?.no_servicio || "",
      no_medidor_cfe: body.ocr_result?.no_medidor || "",
      pago_promedio: Number(body.pago_promedio_mxn || 0),
      periodicidad: body.periodicidad || "bimestral",
      tarifa: body.tarifa || "",
      kwh_consumidos: proposal.kwh_consumidos,
      kwh_consumidos_y_cargas_extra: proposal.kwh_consumidos_y_cargas_extra,
      pago_hipotetico_cargas_extra: proposal.pago_hipotetico_cargas_extra,
      pago_dac_hipotetico_consumo_actual: proposal.pago_dac_hipotetico_consumo_actual,
      pago_dac_hipotetico_cargas_extra: proposal.pago_dac_hipotetico_cargas_extra,
      quiere_aislado: body.plans_cfe === "aislado",
      casa_negocio: body.uso || "Casa",
      numero_personas: Number(body.numero_personas || 0),
      ya_tiene_fv: body.ya_tiene_fv || false,
      tipo_inmueble: body.tipo_inmueble || "",
      metros_distancia: proposal.metros_distancia,
      modelo_ev: body.loads?.ev?.modelo || "",
      km_ev: Number(body.loads?.ev?.km || 0),
      no_minisplits: Number(body.loads?.minisplit?.cantidad || 0),
      horas_minisplit: Number(body.loads?.minisplit?.horas || 0),
      horas_secadora: Number(body.loads?.secadora?.horas || 0),
      bomba_agua: body.cargas?.includes("bomba") || false,
      otro: body.cargas?.includes("otro") || false,
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
