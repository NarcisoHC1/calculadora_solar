// netlify/functions/cotizacion_v2_dev.js
// Versión de desarrollo con datos mock

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    console.log("📥 [DEV MODE] Recibiendo cotización:", body);

    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500));

    // Datos mock para desarrollo
    const mockProposal = {
      kwh_consumidos: 300,
      kwh_consumidos_y_cargas_extra: 450,
      metros_distancia: 30,
      propuesta_actual: {
        potencia_panel: 555,
        cantidad_paneles: 12,
        id_panel: "LON-555W",
        area_needed: 47,
        kwp: "6.66",
        tc: 20,
        costo_paneles: 100000,
        micro_central: "micro",
        id_micro_2_panel: null,
        cantidad_micro_2_panel: 0,
        id_micro_4_panel: "APM-4T",
        cantidad_micro_4_panel: 3,
        costo_microinversores: 45000,
        costo_extras_microinversores: 15000,
        id_montaje: "MONT-12",
        costo_montaje: 12000,
        costo_bos: 15000,
        costo_transporte_incl_seguro: 8000,
        costo_mo: 38500,
        costo_seguro_rc: 5000,
        costos_extraordinarios: 3000,
        costos_viaticos: 0,
        costos_totales: 241500,
        profit_margin: 0.25,
        discount_rate: 0.10,
        precio_lista: 375000,
        subtotal: 321866,
        iva: 51498,
        total: 373364,
        gross_profit: 80366,
        gross_profit_post_cac: 70366,
        secuencia_exhibiciones: "0.5,0.5"
      },
      propuesta_cargas_extra: {
        potencia_panel: 555,
        cantidad_paneles: 18,
        area_needed: 71,
        kwp: "9.99",
        costo_paneles: 150000,
        micro_central: "central",
        id_inversor: "INV-10KW",
        costo_inversor: 55000,
        costos_totales: 305000,
        total: 475000
      }
    };

    console.log("✅ [DEV MODE] Propuesta generada");

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        dev_mode: true,
        project_id: "rec_mock_project",
        proposal_id: "rec_mock_proposal",
        proposal: mockProposal
      })
    };

  } catch (error) {
    console.error("❌ [DEV MODE] Error:", error);
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
