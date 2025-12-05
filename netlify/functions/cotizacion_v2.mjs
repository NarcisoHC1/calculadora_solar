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
    const rawBody = JSON.parse(event.body || "{}");
    const body = rawBody.form || rawBody;
    const ocrResult = rawBody.ocr || rawBody.ocr_result || body.ocr_result;

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

    const ocrData = (ocrResult && (ocrResult.data || ocrResult)) || {};
    const ocrPromedios = ocrData.historicals_promedios || {};

    const periodicidad = body.has_cfe === false
      ? "bimestral"
      : (body.periodicidad || ocrData.Periodicidad || "bimestral");
    const usoNormalized = body.uso === "negocio" || body.uso === "Negocio"
      ? "Negocio"
      : body.uso === "casa" || body.uso === "Casa"
        ? "Casa"
        : body.uso || "";

    const parseYesNo = (value) => {
      if (value === true || value === 'si' || value === 'sí' || value === 'yes') return true;
      if (value === false || value === 'no') return false;
      return undefined;
    };
    const numeroPersonasRaw = body.numero_personas;

    // Generar propuesta completa usando el nuevo motor
    const kwhFromOCR = Number(body.kwh_consumidos || ocrPromedios.kWh_consumidos || ocrData.kwh_consumidos || ocrData.energia_periodo_kwh || 0) || null;

    const formDataForEngine = {
      // Basic info
      estado: body.estado || "",
      municipio: body.municipio || "Ciudad de México",
      has_cfe: body.has_cfe,
      tiene_recibo: body.has_cfe === true && body.tiene_recibo === true,
      pago_promedio: Number(body.pago_promedio_mxn || ocrPromedios.Pago_Prom_MXN_Periodo || 0),
      periodicidad,
      tarifa: body.tarifa || ocrData.Tarifa || "",
      kwh_consumidos: kwhFromOCR,

      // Property
      uso: usoNormalized || "Casa",
      casa_negocio: usoNormalized || "",
      numero_personas: numeroPersonasRaw,
      rango_personas_negocio: body.rango_personas_negocio || "",
      tipo_inmueble: body.tipo_inmueble || "",
      pisos: Number(body.pisos || 0),
      distancia_techo_tablero: Number(body.distancia_techo_tablero || 0),

      // Loads
      loads: {
        ev: body.loads?.ev || null,
        minisplit: body.loads?.minisplit || null,
        secadora: body.loads?.secadora || null,
        bomba: body.loads?.bomba === true,
        otro: body.loads?.otro === true
      },

      // Planning flags
      plans_cfe: body.plans_cfe,
      ya_tiene_fv: parseYesNo(body.ya_tiene_fv)
    };

    const proposal = await generateCompleteProposal(formDataForEngine);
    console.log("🧮 Propuesta completa calculada");

    // Determine field values with proper logic
    const hasCFE = body.has_cfe === true;
    const tieneReciboCFE = hasCFE && (body.tiene_recibo === true || ocrResult?.ok === true);
    const quiereAislado = body.plans_cfe === "aislado";
    const yaTieneFV = parseYesNo(body.ya_tiene_fv);
    const propuestaAuto = body.propuesta_auto === true ? true : (body.propuesta_auto === false ? false : undefined);
    const distanciaInput = body.distancia_techo_tablero ?? body.distancia;
    const distanciaNumerica = Number(distanciaInput);
    const metrosDistancia = Number.isFinite(distanciaNumerica) && distanciaNumerica > 0
      ? distanciaNumerica
      : (Number.isFinite(proposal.metros_distancia) && proposal.metros_distancia > 0
        ? proposal.metros_distancia
        : null);

    // Determine casa_negocio - only set if explicitly asked
    const casaNegocio = usoNormalized ? usoNormalized : "";

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
    const tarifaResidencial = /^(1[A-F]?|DAC)$/i.test(proposal.tarifa || ocrData.Tarifa || body.tarifa || "");

    // Preparar datos para Submission_Details
    const submissionData = {
      ocr_manual: ocrResult ? "OCR" : "manual",
      ocr_json: ocrResult ? JSON.stringify(ocrResult) : null,
      OCR_JSON: ocrResult ? JSON.stringify(ocrResult) : null,
      OCR_Manual: ocrResult ? "ocr" : "manual",
      Imagen_recibo: body.ocr_image || ocrResult?.Imagen_recibo || null,
      estado: body.estado || ocrData.Estado || "",
      tiene_contrato_cfe: hasCFE,
      tiene_recibo_cfe: tieneReciboCFE,
      no_servicio_cfe: ocrResult?.no_servicio || "",
      no_medidor_cfe: ocrResult?.no_medidor || "",
      Numero_Servicio_CFE: ocrData.Numero_Servicio_CFE || ocrResult?.no_servicio || "",
      Numero_Medidor_CFE: ocrData.Numero_Medidor_CFE || ocrResult?.no_medidor || "",
      Fases: ocrData.Fases,
      pago_promedio: proposal.pago_promedio || Number(body.pago_promedio_mxn || 0),
      Pago_Prom_MXN_Periodo: ocrPromedios.Pago_Prom_MXN_Periodo ?? proposal.pago_promedio ?? Number(body.pago_promedio_mxn || 0),
      periodicidad,
      Periodicidad: ocrData.Periodicidad || periodicidad,
      tarifa: proposal.tarifa || ocrData.Tarifa || body.tarifa || "",
      Tarifa: ocrData.Tarifa || proposal.tarifa || body.tarifa || "",
      kwh_consumidos: ocrPromedios.kWh_consumidos ?? proposal.kwh_consumidos,
      kWh_consumidos: ocrPromedios.kWh_consumidos ?? proposal.kwh_consumidos,
      kwh_consumidos_y_cargas_extra: proposal.kwh_consumidos_y_cargas_extra,
      pago_hipotetico_cargas_extra: proposal.pago_hipotetico_cargas_extra,
      pago_dac_hipotetico_consumo_actual: tarifaResidencial ? proposal.pago_dac_hipotetico_consumo_actual : null,
      pago_dac_hipotetico_cargas_extra: tarifaResidencial ? proposal.pago_dac_hipotetico_cargas_extra : null,
      quiere_aislado: quiereAislado,
      casa_negocio: casaNegocio,
      numero_personas: casaNegocio === "Negocio"
        ? (body.rango_personas_negocio || "")
        : (numeroPersonasRaw !== undefined && numeroPersonasRaw !== null && numeroPersonasRaw !== ''
          ? String(numeroPersonasRaw)
          : ""),
      rango_personas_negocio: body.rango_personas_negocio || "",
      ya_tiene_fv: yaTieneFV,
      tipo_inmueble: tipoInmuebleMapped,
      metros_distancia: metrosDistancia,
      modelo_ev: body.loads?.ev?.modelo || "",
      km_ev: Number(body.loads?.ev?.km || 0),
      no_minisplits: Number(body.loads?.minisplit?.cantidad || 0),
      horas_minisplit: Number(body.loads?.minisplit?.horas || 0),
      horas_secadora: Number(body.loads?.secadora?.horas || 0),
      bomba_agua: body.loads?.bomba === true,
      otro: body.loads?.otro === true,
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
      twclid: body.utms?.twclid || "",
      propuesta_auto: propuestaAuto
    };

    const submissionId = await createSubmissionDetails({
      projectId,
      data: submissionData
    });
    console.log("✅ Submission_Details:", submissionId);

    let proposalId = null;
    if (proposal.propuesta_actual) {
      proposalId = await createProposal({
        projectId,
        proposalData: { ...proposal.propuesta_actual, kwh_consumidos: proposal.kwh_consumidos, kwh_consumidos_y_cargas_extra: proposal.kwh_consumidos_y_cargas_extra },
        proposalCargasExtra: proposal.propuesta_cargas_extra
      });
      console.log("✅ Proposal:", proposalId);
    } else {
      console.warn("⚠️ Proposal calculation skipped due to invalid location or missing data");
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        project_id: projectId,
        proposal_id: proposalId,
        proposal: {
          tarifa: proposal.tarifa,
          kwh_consumidos: proposal.kwh_consumidos,
          kwh_consumidos_y_cargas_extra: proposal.kwh_consumidos_y_cargas_extra,
          metros_distancia: metrosDistancia,
          propuesta_actual: proposal.propuesta_actual,
          propuesta_cargas_extra: proposal.propuesta_cargas_extra,
          frontend_outputs: proposal.frontend_outputs,
          periodicidad: proposal.periodicidad,
          limite_dac_mensual_kwh: proposal.limite_dac_mensual_kwh,
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
