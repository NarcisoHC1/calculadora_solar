// netlify/functions/cotizacion_v2.js
import { CORS, upsertLead, createProject, createSubmissionDetails, createProposal } from "./lib/airtable.js";
import { generateProposal } from "./lib/calculator.js";

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

    const submissionData = {
      estado: body.estado || "",
      tiene_contrato_cfe: body.has_cfe !== false,
      tiene_recibo_cfe: body.tiene_recibo !== false,
      pago_promedio: Number(body.pago_promedio_mxn || 0),
      periodicidad: body.periodicidad || "bimestral",
      tarifa: body.tarifa || "",
      casa_negocio: body.uso || "Casa",
      numero_personas: Number(body.numero_personas || 0),
      quiere_aislado: body.plans_cfe === "aislado",
      tipo_inmueble: body.tipo_inmueble || "",
      texto_libre: body.notes || "",
      modelo_ev: body.loads?.ev?.modelo || "",
      km_ev: Number(body.loads?.ev?.km || 0),
      no_minisplits: Number(body.loads?.minisplit?.cantidad || 0),
      horas_minisplit: Number(body.loads?.minisplit?.horas || 0),
      horas_secadora: Number(body.loads?.secadora?.horas || 0),
      bomba_agua: body.cargas?.includes("bomba") || false,
      otro: body.cargas?.includes("otro") || false,
      ref: body.utms?.ref || "",
      utm_source: body.utms?.utm_source || "",
      utm_medium: body.utms?.utm_medium || "",
      utm_campaign: body.utms?.utm_campaign || "",
      utm_term: body.utms?.utm_term || "",
      utm_content: body.utms?.utm_content || "",
      gclid: body.utms?.gclid || "",
      fbclid: body.utms?.fbclid || ""
    };

    const formDataForCalc = {
      pago_promedio: submissionData.pago_promedio,
      periodicidad: submissionData.periodicidad,
      tarifa: submissionData.tarifa,
      tipo_inmueble: submissionData.tipo_inmueble,
      pisos: Number(body.pisos || 0),
      distancia_techo_tablero: Number(body.distancia_techo_tablero || 0),
      cargas: {
        ev: body.loads?.ev || null,
        minisplit: body.loads?.minisplit || null,
        secadora: { horas: submissionData.horas_secadora },
        bomba: submissionData.bomba_agua,
        otro: submissionData.otro
      }
    };

    const proposalCalc = generateProposal(formDataForCalc);
    console.log("🧮 Propuesta calculada");

    submissionData.kwh_consumidos = proposalCalc.kwh_consumidos;
    submissionData.kwh_consumidos_y_cargas_extra = proposalCalc.kwh_consumidos_y_cargas_extra;
    submissionData.metros_distancia = proposalCalc.metros_distancia;

    const submissionId = await createSubmissionDetails({
      projectId,
      data: submissionData
    });
    console.log("✅ Submission_Details:", submissionId);

    const proposalId = await createProposal({
      projectId,
      proposalData: proposalCalc
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
          kwp: proposalCalc.kwp,
          cantidad_paneles: proposalCalc.cantidad_paneles,
          potencia_panel: proposalCalc.potencia_panel,
          total: proposalCalc.total,
          subtotal: proposalCalc.subtotal,
          iva: proposalCalc.iva,
          precio_lista: proposalCalc.precio_lista
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
