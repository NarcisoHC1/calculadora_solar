// netlify/functions/referral.mjs
import { CORS, queryRecords, createRecord, esc } from "./lib/airtable.mjs";

const slug = s => String(s||"").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const uniq = () => Date.now().toString(36).slice(-5);

export async function handler(event){
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod === "GET")     return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok:true, endpoint:"referral" }) };
  if (event.httpMethod !== "POST")    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  try{
    const { name, email, whatsapp } = JSON.parse(event.body || "{}");
    if (!email && !whatsapp) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok:false, error:"email_or_whatsapp_required" }) };
    }

    const found = (await queryRecords("Leads_", `OR({Email}='${esc(email)}',{Telefono}='${esc(whatsapp)}')`))[0];
    let leadId = found?.id;
    if (!leadId) {
      const created = await createRecord("Leads_", {
        "Nombre": name || "",
        "Email": email || "",
        "Telefono": whatsapp || ""
      });
      leadId = created.id;
    }

    const primaryValue = (found?.fields?.["Contact_Id"]) || "";
    const filter = primaryValue ? `{Contacto}='${esc(primaryValue)}'` : "";
    const existing = filter ? (await queryRecords("Referrers", filter))[0] : null;

    if (existing) {
      const link = existing.fields?.["Link"] || "";
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok:true, link, reused:true }) };
    }

    const refCode = `${slug(name || "anon")}-${uniq()}`;
    const link = `https://www.solarya.mx/calcula-tu-ahorro-instalando-paneles-solares?ref=${refCode}`;

    await createRecord("Referrers", {
      "Contacto": [leadId],
      "ref_code": refCode,
      "Link": link
    });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok:true, link, reused:false }) };

  }catch(e){
    console.error(e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok:false, error:String(e.message||e) }) };
  }
}
