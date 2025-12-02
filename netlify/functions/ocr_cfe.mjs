// netlify/functions/ocr_cfe.mjs
import { CORS, createRecord } from "./lib/airtable.mjs";

const OCR_BASE = (process.env.OCR_BASE || process.env.OCR_SERVICE_BASE || process.env.OCR_API_BASE || "").replace(/\/+$/, "");
const OCR_ENDPOINT = OCR_BASE ? `${OCR_BASE}/v1/ocr/cfe` : "";

const respond = (statusCode, body) => ({
  statusCode,
  headers: CORS,
  body: JSON.stringify(body)
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { ok: false, error: "Method Not Allowed" });
  }

  if (!OCR_ENDPOINT) {
    return respond(500, { ok: false, error: "OCR_BASE no configurado" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return respond(400, { ok: false, error: "JSON inválido" });
  }

  const images = Array.isArray(payload.images) ? payload.images.filter(Boolean) : [];
  if (!images.length) {
    return respond(400, { ok: false, error: "no_images" });
  }

  const filename = payload.filename || "upload";
  const compressedImage = payload.compressed_image;

  let ocrResult;
  try {
    const resp = await fetch(OCR_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, filename })
    });
    ocrResult = await resp.json();
    if (!resp.ok) {
      throw new Error(ocrResult?.error || resp.statusText);
    }
  } catch (err) {
    console.error("OCR relay error:", err);
    return respond(502, { ok: false, error: "ocr_service_error" });
  }

  const responsePayload = {
    ok: !!ocrResult?.ok,
    quality: ocrResult?.quality ?? null,
    warnings: ocrResult?.warnings || [],
    data: ocrResult?.data || {},
    form_overrides: ocrResult?.form_overrides || {}
  };

  if (ocrResult?.ok) {
    try {
      const data = ocrResult.data || {};
      const prom = data.historicals_promedios || {};
      const fields = {};
      const setField = (key, value) => {
        if (value !== undefined && value !== null && value !== "") {
          fields[key] = value;
        }
      };

      setField("Periodicidad", data.Periodicidad);
      setField("Numero_Servicio_CFE", data.Numero_Servicio_CFE);
      setField("Numero_Medidor_CFE", data.Numero_Medidor_CFE);
      setField("Fases", data.Fases);
      setField("Pago_Prom_MXN_Periodo", prom.Pago_Prom_MXN_Periodo ?? data.Pago_Prom_MXN_Periodo);
      setField("kWh_consumidos", prom.kWh_consumidos ?? data.kWh_consumidos);
      setField("Tarifa", data.Tarifa || data.tarifa);
      setField("OCR_JSON", JSON.stringify(ocrResult));
      setField("OCR_Manual", "ocr");
      if (compressedImage) setField("Imagen_recibo", compressedImage);

      if (Object.keys(fields).length) {
        await createRecord("Submission_Details", fields);
      }
    } catch (err) {
      console.error("Airtable OCR save error:", err);
    }
  }

  return respond(200, responsePayload);
}
