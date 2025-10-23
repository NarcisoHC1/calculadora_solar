// src/App.tsx
import { useEffect, useState } from "react";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Lock, Info } from "lucide-react";

type Step = 1 | 2 | 3;

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "";       // Netlify (backend cálculos)
const OCR_BASE = (import.meta as any).env?.VITE_OCR_BASE || "";       // Railway (OCR)

const QUALITY_THRESHOLD = 0.6; // Umbral mínimo para considerar OCR “bueno”

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Upload
  const [files, setFiles] = useState<File[]>([]);
  const fileUploaded = files.length > 0;
  const [fileNames, setFileNames] = useState<string[]>([]);

  // OCR state
  const [ocrStatus, setOcrStatus] = useState<"idle"|"running"|"ok"|"warn"|"fail">("idle");
  const [ocrMsg, setOcrMsg] = useState("");
  const [ocrData, setOcrData] = useState<any>(null); // datos “data” de Railway
  const [ocrQuality, setOcrQuality] = useState<number | null>(null);

  // Flags
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Calculando tu propuesta…");
  function showLoading(msg = "Procesando…") { setLoadingMsg(msg); setLoading(true); try{window.parent?.postMessage({type:"status",status:"processing"},"*")}catch{} }
  function hideLoading() { setLoading(false); try{window.parent?.postMessage({type:"status",status:"done"},"*")}catch{} }

  // Step 1
  const [showManual, setShowManual] = useState(false);
  const [hasCFE, setHasCFE] = useState("");              // si | no
  const [planCFE, setPlanCFE] = useState("");            // si | no | aislado
  const [usoCasaNegocio, setUsoCasaNegocio] = useState("");// casa | negocio
  const [numPersonasCasa, setNumPersonasCasa] = useState("");
  const [rangoPersonasNegocio, setRangoPersonasNegocio] = useState("");
  const [pago, setPago] = useState("");
  const [periodo, setPeriodo] = useState("bimestral");
  const [tarifa, setTarifa] = useState("");
  const [cp, setCP] = useState("");
  const [expand, setExpand] = useState("");
  const [showError, setShowError] = useState(false);     // consumo bajo

  // Step 2
  const [cargas, setCargas] = useState<string[]>([]);
  const [cargaDetalles, setCargaDetalles] = useState<{ ev?:{modelo:string;km:string}; minisplit?:{cantidad:string;horas:string} }>({});
  const [tipoInmueble, setTipoInmueble] = useState("");
  const [pisos, setPisos] = useState("");
  const [notas, setNotas] = useState("");

  // Step 3
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");  // validación 10 dígitos
  const [uso, setUso] = useState("");
  const [privacidad, setPrivacidad] = useState(false);

  // Modales
  const [showResultModal, setShowResultModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Helpers
  const isNoCFEPlanningFlow = hasCFE === "no" && planCFE === "si";
  const isNoCFENoPlanning  = hasCFE === "no" && (planCFE === "no" || planCFE === "aislado");

  // ---------- Upload handlers ----------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const next = [...files, ...selected].slice(0, 2);
    setFiles(next);
    setFileNames(next.map(f => f.name));
    setShowManual(false);

    // Si sube recibo, asumimos que SÍ tiene CFE y queremos correr OCR de inmediato.
    setHasCFE("si");
    setPlanCFE("");
    await runOCRNow(next);
  };

  const removeFileAt = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setFileNames(next.map(f => f.name));
    if (next.length === 0) {
      setOcrStatus("idle");
      setOcrData(null);
      setOcrQuality(null);
      setTarifa("");
      setCP("");
    }
  };

  const startManual = () => {
    setShowManual(true);
    setFiles([]);
    setFileNames([]);
    setOcrStatus("idle");
    setOcrData(null);
    setOcrQuality(null);
  };

  // ---------- OCR client-side (PDF→img si aplica) ----------
  async function fileToDataURLs(file: File): Promise<string[]> {
    // Imagen
    if (file.type.startsWith("image/")) {
      const b64 = await blobToDataURL(file);
      return [b64];
    }
    // PDF -> 1–2 páginas a JPEG
    if (file.type === "application/pdf") {
      const pdfjsLib = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.min.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs";
      const buf = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buf });
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages, 2);
      const out: string[] = [];
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        out.push(canvas.toDataURL("image/jpeg", 0.85));
      }
      return out;
    }
    return [];
  }
  function blobToDataURL(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function runOCRNow(curFiles: File[]) {
    if (!OCR_BASE) {
      setOcrStatus("fail");
      setOcrMsg("OCR no configurado (VITE_OCR_BASE).");
      return;
    }
    setOcrStatus("running");
    setOcrMsg("Procesando tu recibo…");

    try {
      // Convertir todos los archivos a dataURLs, limitar 3 imágenes
      let imgs: string[] = [];
      for (const f of curFiles) imgs = imgs.concat(await fileToDataURLs(f));
      imgs = imgs.slice(0, 3);

      if (!imgs.length) {
        setOcrStatus("fail");
        setOcrMsg("No se pudo leer el archivo. Sube PDF/JPG/PNG.");
        return;
      }

      const res = await fetch(`${OCR_BASE.replace(/\/+$/,"")}/v1/ocr/cfe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imgs, filename: curFiles.map(f=>f.name).join(", ") })
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json) {
        setOcrStatus("fail");
        setOcrMsg("El servicio de OCR no respondió correctamente.");
        return;
      }

      const ok: boolean = !!json.ok;
      const quality: number | null = typeof json.quality === "number" ? json.quality : null;
      setOcrQuality(quality);
      setOcrData(json.data || null);

      // Prellenado si hay overrides
      const overrides = json.form_overrides || {};
      if (overrides.tarifa && !tarifa) setTarifa(String(overrides.tarifa).toUpperCase());
      if (overrides.cp && !cp)         setCP(String(overrides.cp));

      if (ok && quality != null && quality >= QUALITY_THRESHOLD) {
        setOcrStatus("ok");
        setOcrMsg("¡Recibo leído correctamente!");
      } else {
        setOcrStatus("warn");
        setOcrMsg("No se logró extraer con suficiente calidad. Sube una imagen más nítida o captura manual.");
      }
    } catch (e: any) {
      console.error(e);
      setOcrStatus("fail");
      setOcrMsg("Error al conectar con el OCR.");
    }
  }

  // ---------- Validaciones ----------
  const canProceedStep1 = () => {
    // Si subió recibo y OCR fue OK, puede seguir
    if (fileUploaded && ocrStatus === "ok") return true;

    // Si subió recibo pero OCR no fue ok, NO bloqueamos si decide manual → requiere presionar "Capturar manual"
    if (fileUploaded && (ocrStatus === "warn" || ocrStatus === "fail")) return false;

    // Manual:
    if (!showManual) return false;
    if (!hasCFE) return false;

    if (hasCFE === "no") {
      if (!planCFE) return false;
      if (planCFE === "no" || planCFE === "aislado") return true;
      if (planCFE === "si") {
        if (!usoCasaNegocio) return false;
        if (usoCasaNegocio === "casa" && !numPersonasCasa) return false;
        if (usoCasaNegocio === "negocio" && !rangoPersonasNegocio) return false;
        return true;
      }
    }

    if (hasCFE === "si") {
      if (!pago || !tarifa || !cp || !expand) return false;
      const pagoNum = parseFloat(pago);
      const threshold = 2500;
      const bimestral = periodo === "bimestral" ? pagoNum : pagoNum * 2;
      if (bimestral < threshold) return false;
    }
    return true;
  };

  const canProceedStep2 = () => {
    if (!tipoInmueble) return false;
    if (["2","4","5","8"].includes(tipoInmueble) && !pisos) return false;

    if (cargas.includes("ev")) {
      if (!cargaDetalles.ev?.modelo || !cargaDetalles.ev?.km) return false;
    }
    if (cargas.includes("minisplit")) {
      if (!cargaDetalles.minisplit?.cantidad || !cargaDetalles.minisplit?.horas) return false;
    }
    return true;
  };

  // Tel: 10 dígitos exactos
  const telDigits = telefono.replace(/\D/g, "");
  const telValid = telDigits.length === 10;

  const nextStep = () => {
    if (currentStep === 1) {
      // Si hay recibo y OCR ok → paso 2
      if (fileUploaded && ocrStatus === "ok") {
        setCurrentStep(2);
        return;
      }
      // Manual (no CFE)
      if (isNoCFENoPlanning || isNoCFEPlanningFlow) {
        setCurrentStep(3);
        return;
      }
    }
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };
  const prevStep = () => currentStep > 1 && setCurrentStep((currentStep - 1) as Step);

  // Warn consumo bajo
  useEffect(() => {
    if (!showManual) return;
    const pagoNum = parseFloat(pago || "0");
    const threshold = 2500;
    const bimestral = periodo === "bimestral" ? pagoNum : pagoNum * 2;
    setShowError(bimestral > 0 && bimestral < threshold);
  }, [pago, periodo, showManual]);

  // Toggle cargas
  const handleCargaToggle = (carga: string, checked: boolean) => {
    if (checked) {
      setCargas([...cargas, carga]);
    } else {
      setCargas(cargas.filter(c => c !== carga));
      const newD = { ...cargaDetalles };
      if (carga === "ev") delete newD.ev;
      if (carga === "minisplit") delete newD.minisplit;
      setCargaDetalles(newD);
    }
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !correo || !telefono || !uso || !privacidad) return;
    if (!telValid) { alert("Tu WhatsApp debe tener 10 dígitos."); return; }

    // Regla de desvío a MANUAL por valores altos o tarifa industrial
    const highValue = parseFloat(pago || "0") >= 50000;
    const industrialTariff = ["GDBT","GDMTH","GDMTO"].includes(tarifa.toUpperCase());
    const noCFEPlan = isNoCFENoPlanning;

    let flow: "AUTO"|"MANUAL"|"BLOCKED" = "AUTO";
    let flow_reason = "ok";
    if (industrialTariff) { flow = "MANUAL"; flow_reason = "tariff_business"; }
    else if (highValue)   { flow = "MANUAL"; flow_reason = "high_monthly"; }
    else if (noCFEPlan)   { flow = "MANUAL"; flow_reason = "no_cfe"; }

    showLoading("Calculando tu propuesta…");

    const loads = cargaDetalles || {};
    const bridge = (window as any).SYBridge;
    const utms = (bridge?.getParentUtms?.() || {}) as any;
    const req_id = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : String(Date.now());

    // Si tarifa es “no sé”, backend hace default: Casa→1, Negocio→PDBT
    const formPayload: any = {
      nombre,
      email: correo,
      telefono,
      uso,
      periodicidad: periodo || "bimestral",
      pago_promedio_mxn: parseFloat(pago || "0") || 0,
      cp,
      tarifa,
      tipo_inmueble: tipoInmueble || "",
      pisos: parseInt(pisos || "0", 10) || 0,
      notes: notas || "",
      loads,
      has_cfe: hasCFE !== "no",
      plans_cfe: planCFE !== "no" && planCFE !== "aislado"
      // roof_area_m2: omitido
      // tenencia: omitido
    };

    // Pasamos al backend EL OCR (si existió y aunque haya sido warn)
    const ocrForBackend = ocrData ? { ok: ocrStatus === "ok", quality: ocrQuality, data: ocrData } : null;

    try {
      const res = await fetch(`${API_BASE}/api/cotizacion_v2`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ req_id, flow, flow_reason, utms, ocr: ocrForBackend, form: formPayload })
      });
      const json = await res.json();

      if (!res.ok || json.ok === false) throw new Error(json?.error || "cotizacion_error");

      if (json.mode === "AUTO" && json.pid) {
        hideLoading();
        bridge?.gtm?.("cotizador_v2_auto", { pid: json.pid });
        // Si ya tienes una vista /propuesta-v2:
        bridge?.navigate?.(`/propuesta-v2?pid=${encodeURIComponent(json.pid)}`, { proposal: json.proposal || null });
        setShowResultModal(true);
        return;
      }
      if (json.mode === "MANUAL") {
        hideLoading();
        bridge?.gtm?.("cotizador_v2_manual", { reason: json.reason || flow_reason });
        setShowContactModal(true);
        return;
      }
      if (json.mode === "BLOCKED") {
        hideLoading();
        bridge?.gtm?.("cotizador_v2_blocked", { reason: json.reason || flow_reason });
        alert("Por ahora no podemos procesar tu caso automáticamente.");
        return;
      }

      hideLoading();
      setShowResultModal(true);
    } catch (err) {
      console.error(err);
      hideLoading();
      alert("Ocurrió un error al procesar tu propuesta. Intenta de nuevo.");
    }
  };

  const progressPercentage = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: "#1e3a2b" }}>
            Calcula tu ahorro con SolarYa
          </h1>
          <p className="text-slate-600">Completa 3 pasos para obtener tu propuesta</p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">Paso {currentStep} de 3</span>
            <span className="text-xs text-slate-500">{progressPercentage}% completado</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-500" style={{ width: `${progressPercentage}%`, backgroundImage: "linear-gradient(90deg,#3cd070,#1e3a2b)" }} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {!showManual ? (
                <div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: "#1e3a2b" }}>Sube tu recibo de CFE</h2>
                  <p className="text-slate-600 mb-6">Lo leemos automáticamente para prellenar tu información</p>

                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                    <input id="file-upload" type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileUpload} />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#3cd07022" }}>
                          <Upload className="w-8 h-8" style={{ color: "#3cd070" }} />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900 mb-1">Arrastra o haz clic (máx. 2)</p>
                          <p className="text-sm text-slate-500">PDF, JPG o PNG • Máx. 10MB c/u</p>
                        </div>
                      </div>
                    </label>

                    {fileUploaded && (
                      <div className="mt-4 flex flex-col items-center gap-2">
                        {fileNames.map((n, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" style={{ color: "#3cd070" }} />
                            <span className="text-sm font-medium">{n}</span>
                            <button onClick={() => removeFileAt(i)} className="text-xs underline text-slate-500 hover:text-slate-700">quitar</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Estado OCR */}
                  {fileUploaded && (
                    <div className="mt-4">
                      {ocrStatus === "running" && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Info className="w-4 h-4" />
                          <span>Procesando tu recibo…</span>
                        </div>
                      )}
                      {ocrStatus === "ok" && (
                        <div className="rounded-xl p-3 border border-green-200 bg-green-50 text-green-800 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>{ocrMsg}</span>
                          {ocrQuality != null && <span className="text-xs ml-auto">calidad: {(ocrQuality*100).toFixed(0)}%</span>}
                        </div>
                      )}
                      {ocrStatus === "warn" && (
                        <div className="rounded-xl p-3 border border-amber-200 bg-amber-50 text-amber-800 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          <div>
                            <div className="font-medium">{ocrMsg}</div>
                            <div className="text-xs">Tips: foto sin sombras, encuadrada y legible; o captura manual.</div>
                          </div>
                        </div>
                      )}
                      {ocrStatus === "fail" && (
                        <div className="rounded-xl p-3 border border-red-200 bg-red-50 text-red-800 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          <div>
                            <div className="font-medium">{ocrMsg}</div>
                            <div className="text-xs">Intenta nuevamente o usa captura manual.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
                    <p className="text-sm text-slate-700">
                      <strong>Tip:</strong> Sube ambas páginas (frente y reverso) para mayor precisión.
                    </p>
                  </div>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300"/></div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-slate-500">¿No tienes el archivo?</span>
                    </div>
                  </div>

                  <button
                    onClick={startManual}
                    className="w-full py-3 px-4 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50"
                  >
                    Capturar datos manualmente
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold" style={{ color: "#1e3a2b" }}>Captura manual</h2>
                    <button onClick={() => setShowManual(false)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                      <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Volver</span>
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">¿Tienes contrato con CFE?</label>
                      <select
                        value={hasCFE}
                        onChange={(e) => { setHasCFE(e.target.value); setPlanCFE(""); setUsoCasaNegocio(""); setNumPersonasCasa(""); setRangoPersonasNegocio(""); }}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                        style={{ outlineColor: "#3cd070" }}
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    {hasCFE === "no" && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Si no tienes, ¿planeas contratarlo?</label>
                        <select
                          value={planCFE}
                          onChange={(e) => { setPlanCFE(e.target.value); setUsoCasaNegocio(""); setNumPersonasCasa(""); setRangoPersonasNegocio(""); }}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                          style={{ outlineColor: "#3cd070" }}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="si">Sí</option>
                          <option value="aislado">No, quiero instalar un sistema aislado</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    )}

                    {hasCFE === "no" && planCFE === "si" && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">¿Es para casa o negocio?</label>
                          <select
                            value={usoCasaNegocio}
                            onChange={(e) => { setUsoCasaNegocio(e.target.value); setNumPersonasCasa(""); setRangoPersonasNegocio(""); }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                            style={{ outlineColor: "#3cd070" }}
                          >
                            <option value="">Selecciona una opción</option>
                            <option value="casa">Casa</option>
                            <option value="negocio">Negocio</option>
                          </select>
                        </div>
                        {usoCasaNegocio === "casa" && (
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">¿Cuántas personas habrá en la casa?</label>
                            <input type="number" value={numPersonasCasa} onChange={(e)=>setNumPersonasCasa(e.target.value)}
                                   placeholder="Ej. 4" min="1"
                                   className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                                   style={{ outlineColor: "#3cd070" }} />
                          </div>
                        )}
                        {usoCasaNegocio === "negocio" && (
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">¿Cuántas personas habrá en el negocio?</label>
                            <select value={rangoPersonasNegocio} onChange={(e)=>setRangoPersonasNegocio(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                                    style={{ outlineColor: "#3cd070" }}>
                              <option value="">Selecciona un rango</option>
                              <option value="1-10">1-10</option>
                              <option value="11-50">11-50</option>
                              <option value="51-250">51-250</option>
                              <option value="251+">251 o más</option>
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    {hasCFE === "si" && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Pago a CFE (MXN)</label>
                            <input type="number" value={pago} onChange={(e)=>setPago(e.target.value)} placeholder="Ej. 3,200"
                                   className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                                   style={{ outlineColor: "#3cd070" }} />
                            <p className="text-xs text-slate-500 mt-1">Si usas “diablitos”, este pago no refleja tu consumo real</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Periodicidad</label>
                            <select value={periodo} onChange={(e)=>setPeriodo(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                                    style={{ outlineColor: "#3cd070" }}>
                              <option value="bimestral">Bimestral</option>
                              <option value="mensual">Mensual</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Tarifa</label>
                            <select value={tarifa} onChange={(e)=>setTarifa(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                                    style={{ outlineColor: "#3cd070" }}>
                              <option value="">Selecciona tu tarifa</option>
                              <option>1</option><option>1A</option><option>1B</option><option>1C</option>
                              <option>1D</option><option>1E</option><option>1F</option>
                              <option>DAC</option><option>PDBT</option><option>GDBT</option><option>GDMTH</option><option>GDMTO</option>
                              <option value="nose">No sé</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Código postal</label>
                            <input type="text" value={cp} onChange={(e)=>setCP(e.target.value.replace(/\D/g,"").slice(0,5))}
                                   placeholder="Ej. 06100" maxLength={5}
                                   className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                                   style={{ outlineColor: "#3cd070" }} />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">¿Ya tienes FV y quieres expandirlo?</label>
                          <select value={expand} onChange={(e)=>setExpand(e.target.value)}
                                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                                  style={{ outlineColor: "#3cd070" }}>
                            <option value="">Selecciona una opción</option>
                            <option>Sí</option><option>No</option>
                          </select>
                        </div>

                        {showError && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            <p className="text-sm text-red-800">Por tu nivel de consumo, por ahora no atendemos tu área.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={nextStep}
                  disabled={!canProceedStep1()}
                  className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl disabled:opacity-50"
                  style={{ background: "#3cd070" }}
                >
                  <span>Siguiente</span><ArrowRight className="w-5 h-5" />
                </button>
                {/* Nota al usuario cuando OCR no ok */}
                {fileUploaded && (ocrStatus === "warn" || ocrStatus === "fail") && !showManual && (
                  <button
                    onClick={startManual}
                    className="px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50"
                  >
                    Capturar manualmente
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: "#1e3a2b" }}>Detalles del inmueble</h2>
                <p className="text-slate-600 mb-6">Ayúdanos a entender mejor tus necesidades</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">¿Planeas instalar alguno de estos?</label>
                    <p className="text-xs text-slate-500 mb-3">(Opcional - puedes elegir varias)</p>
                    <div className="space-y-3">
                      {[
                        { value: "ev", label: "Cargador para coche eléctrico" },
                        { value: "minisplit", label: "Minisplit / A/C" },
                        { value: "secadora", label: "Secadora eléctrica" },
                        { value: "bomba", label: "Bomba de agua / alberca" },
                        { value: "otro", label: "Otro" },
                      ].map((item) => (
                        <div key={item.value}>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={cargas.includes(item.value)}
                              onChange={(e) => handleCargaToggle(item.value, e.target.checked)}
                              className="w-5 h-5 border-slate-300 rounded focus:ring-2"
                              style={{ accentColor: "#3cd070" }}
                            />
                            <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">{item.label}</span>
                          </label>

                          {cargas.includes(item.value) && item.value === "ev" && (
                            <div className="ml-8 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Modelo</label>
                                <select
                                  value={cargaDetalles.ev?.modelo || ""}
                                  onChange={(e)=>setCargaDetalles({ ...cargaDetalles, ev:{ modelo:e.target.value, km:cargaDetalles.ev?.km || "" } })}
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                  style={{ outlineColor: "#3cd070" }}
                                >
                                  <option value="">Selecciona el modelo</option>
                                  <option value="tesla-model3">Tesla Model 3</option>
                                  <option value="tesla-modely">Tesla Model Y</option>
                                  <option value="byd-seal">BYD Seal</option>
                                  <option value="byd-dolphin">BYD Dolphin</option>
                                  <option value="nissan-leaf">Nissan Leaf</option>
                                  <option value="chevrolet-bolt">Chevrolet Bolt</option>
                                  <option value="otro">Otro</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Km diarios</label>
                                <input type="number" value={cargaDetalles.ev?.km || ""} onChange={(e)=>setCargaDetalles({
                                  ...cargaDetalles, ev: { modelo:cargaDetalles.ev?.modelo || "", km:e.target.value }
                                })}
                                placeholder="Ej. 40" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                style={{ outlineColor: "#3cd070" }} />
                              </div>
                            </div>
                          )}

                          {cargas.includes(item.value) && item.value === "minisplit" && (
                            <div className="ml-8 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad</label>
                                <input type="number" value={cargaDetalles.minisplit?.cantidad || ""}
                                       onChange={(e)=>setCargaDetalles({ ...cargaDetalles, minisplit:{ cantidad:e.target.value, horas:cargaDetalles.minisplit?.horas || "" } })}
                                       placeholder="Ej. 2" min={1} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                       style={{ outlineColor: "#3cd070" }} />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Horas diarias</label>
                                <input type="number" value={cargaDetalles.minisplit?.horas || ""}
                                       onChange={(e)=>setCargaDetalles({ ...cargaDetalles, minisplit:{ cantidad:cargaDetalles.minisplit?.cantidad || "", horas:e.target.value } })}
                                       placeholder="Ej. 6" step="0.5" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                       style={{ outlineColor: "#3cd070" }} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de inmueble</label>
                      <select value={tipoInmueble} onChange={(e)=>setTipoInmueble(e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                              style={{ outlineColor: "#3cd070" }}>
                        <option value="">Selecciona una opción</option>
                        <option value="1">Casa o negocio independiente de 1-2 pisos</option>
                        <option value="2">Departamento/local en edificio / condominio vertical</option>
                        <option value="3">Sólo áreas comunes de condominio / fraccionamiento</option>
                        <option value="4">Local en plaza comercial o edificio</option>
                        <option value="5">Conjunto habitacional vertical / condominio vertical</option>
                        <option value="6">Conjunto habitacional horizontal / condominio horizontal</option>
                        <option value="7">Nave industrial / bodega</option>
                        <option value="8">Edificios enteros (hoteles, oficinas, públicos)</option>
                      </select>
                    </div>

                    {["2","4","5","8"].includes(tipoInmueble) && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">No. de pisos del edificio</label>
                        <input type="number" value={pisos} onChange={(e)=>setPisos(e.target.value)} placeholder="Ej. 8" min={1}
                               className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                               style={{ outlineColor: "#3cd070" }} />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">¿Algo más que debamos saber?</label>
                    <p className="text-xs text-slate-500 mb-2">(Opcional)</p>
                    <textarea value={notas} onChange={(e)=>setNotas(e.target.value)} rows={4}
                              placeholder="Sombras por las tardes, antenas en el techo, etc."
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 resize-none"
                              style={{ outlineColor: "#3cd070" }} />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <button onClick={prevStep} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50">
                  <ArrowLeft className="w-5 h-5" /><span>Atrás</span>
                </button>
                <button onClick={nextStep} disabled={!canProceedStep2()} className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl disabled:opacity-50" style={{ background: "#3cd070" }}>
                  <span>Siguiente</span><ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: "#1e3a2b" }}>Información de contacto</h2>
                <p className="text-slate-600 mb-6">Último paso para recibir tu propuesta</p>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre completo</label>
                      <input type="text" value={nombre} onChange={(e)=>setNombre(e.target.value)} required
                             placeholder="Ej. María López"
                             className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                             style={{ outlineColor: "#3cd070" }} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Correo electrónico</label>
                      <input type="email" value={correo} onChange={(e)=>setCorreo(e.target.value)} required
                             placeholder="tunombre@email.com"
                             className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                             style={{ outlineColor: "#3cd070" }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">WhatsApp</label>
                      <input
                        type="tel"
                        value={telefono}
                        onChange={(e)=>setTelefono(e.target.value)}
                        placeholder="5512345678"
                        required
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 ${telValid ? "border-slate-300" : "border-red-300"}`}
                        style={{ outlineColor: telValid ? "#3cd070" : "#ff5c36" }}
                      />
                      {!telValid && <p className="text-xs text-red-600 mt-1">Debe tener exactamente 10 dígitos.</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Casa o negocio</label>
                      <select value={uso} onChange={(e)=>setUso(e.target.value)} required
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2"
                              style={{ outlineColor: "#3cd070" }}>
                        <option value="">Selecciona</option>
                        <option>Casa</option>
                        <option>Negocio</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={privacidad} onChange={(e)=>setPrivacidad(e.target.checked)} required
                             className="w-5 h-5 border-slate-300 rounded focus:ring-2 mt-0.5"
                             style={{ accentColor: "#3cd070" }} />
                      <span className="text-sm text-slate-700">
                        He leído y acepto el <a href="#" className="underline" style={{ color: "#3cd070" }}>aviso de privacidad</a>
                      </span>
                    </label>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-600" />
                    <p className="text-sm text-slate-700">Nunca compartimos tus datos con terceros.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <button type="button" onClick={prevStep} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50">
                  <ArrowLeft className="w-5 h-5" /><span>Atrás</span>
                </button>
                <button type="submit" disabled={!telValid} className="flex items-center gap-2 px-8 py-3 text-white font-bold rounded-xl hover:opacity-90 shadow-lg disabled:opacity-50"
                        style={{ background: "#ff5c36" }}>
                  <span>Calcular mi ahorro</span><ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modals */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={()=>setShowResultModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8" onClick={(e)=>e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#3cd07022" }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: "#3cd070" }} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Propuesta lista!</h3>
              <p className="text-slate-600 mb-6">Te mostraremos tu simulación de ahorro y ROI estimado.</p>
              <button onClick={()=>setShowResultModal(false)} className="w-full py-3 px-6 text-white font-semibold rounded-xl" style={{ background: "#3cd070" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={()=>setShowContactModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8" onClick={(e)=>e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#1e3a2b22" }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: "#1e3a2b" }} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Gracias por tu interés!</h3>
              <p className="text-slate-600 mb-6">Te contactaremos en menos de 24h.</p>
              <button onClick={()=>setShowContactModal(false)} className="w-full py-3 px-6 text-white font-semibold rounded-xl" style={{ background: "#1e3a2b" }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[9999] bg-white/85 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-11 h-11 border-4 border-slate-200 rounded-full animate-spin mx-auto mb-3" style={{ borderTopColor: "#1e3a2b" }} />
            <div className="font-extrabold text-slate-900">{loadingMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
}
