// netlify/functions/ocr_cfe.mjs
import { CORS, createRecord } from "./lib/airtable.mjs";

const OCR_BASE = (process.env.OCR_BASE || process.env.OCR_SERVICE_BASE || process.env.OCR_API_BASE || "").replace(/\/+$/, "");
const OCR_ENDPOINT_OVERRIDE = (process.env.OCR_ENDPOINT || "").trim();

function resolveOcrEndpoint(base, override) {
  const direct = (override || "").replace(/\/+$/, "");
  if (direct) return direct;
  if (!base) return "";

  const trimmed = base.replace(/\/+$/, "");
  const lower = trimmed.toLowerCase();

  if (/\/ocr_cfe$/.test(lower) || /\/v1\/ocr\/cfe$/.test(lower)) return trimmed;
  if (/\/v1\/ocr$/.test(lower)) return `${trimmed}/cfe`;
  return `${trimmed}/v1/ocr/cfe`;
}

const OCR_ENDPOINT = resolveOcrEndpoint(OCR_BASE, OCR_ENDPOINT_OVERRIDE);

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

  // Acepta distintas formas de recibir la imagen desde el front (images, image o compressed_image)
  let images = [];

  if (Array.isArray(payload.images)) {
    images = payload.images.filter(Boolean);
  } else if (payload.image) {
    images = [payload.image];
  } else if (payload.compressed_image) {
    images = [payload.compressed_image];
  }

  if (!images.length) {
    return respond(400, { ok: false, error: "no_images" });
  }

  const filename = payload.filename || "upload";

  const parseDataUrl = (value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (trimmed.startsWith("data:")) {
      const parts = trimmed.split(",", 2);
      const meta = parts[0] || "";
      const data = parts.length === 2 ? parts[1] : null;
      const mime = meta ? meta.slice(5).split(";")[0] || "" : "";
      return { mime, b64: data };
    }
    return { mime: "", b64: trimmed };
  };

  const hasPdfData = images.some((img) => {
    const parsed = parseDataUrl(img);
    return parsed?.mime?.toLowerCase().includes("application/pdf");
  }) || (typeof filename === "string" && filename.toLowerCase().endsWith(".pdf"));

  let ocrResult;
  try {
    let requestInit;

    if (hasPdfData) {
      const form = new FormData();
      images.forEach((img, idx) => {
        const parsed = parseDataUrl(img);
        if (!parsed?.b64) return;
        const mime = parsed.mime || "application/pdf";
        const buffer = Buffer.from(parsed.b64, "base64");
        const blob = new Blob([buffer], { type: mime || "application/pdf" });
        const fname = filename || `upload_${idx + 1}.pdf`;
        form.append("files", blob, fname);
      });
      requestInit = { method: "POST", body: form };
    } else {
      requestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, filename })
      };
    }

    const resp = await fetch(OCR_ENDPOINT, requestInit);

    let body;
    try {
      body = await resp.json();
    } catch {
      body = null;
    }

    if (!resp.ok) {
      console.error("OCR upstream error:", resp.status, body);
      return respond(resp.status, {
        ok: false,
        error: body?.error || `ocr_upstream_${resp.status}`
      });
    }

    ocrResult = body;
  } catch (err) {
    console.error("OCR relay error:", err);
    return respond(502, { ok: false, error: "ocr_service_unreachable" });
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
      if (Object.keys(fields).length) {
        await createRecord("Submission_Details", fields);
      }
    } catch (err) {
      console.error("Airtable OCR save error:", err);
    }
  }

  return respond(200, responsePayload);
}
