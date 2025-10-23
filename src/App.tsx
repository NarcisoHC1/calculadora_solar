import { useState, useEffect } from 'react';
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Lock } from 'lucide-react';

type Step = 1 | 2 | 3;

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
const OCR_BASE = (import.meta as any).env?.VITE_OCR_BASE || '';

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  const [files, setFiles] = useState<File[]>([]);
  const fileUploaded = files.length > 0;
  const [fileNames, setFileNames] = useState<string[]>([]);

  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'ok' | 'fail'>('idle');
  const [ocrMsg, setOcrMsg] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<any>(null);

  const [showManual, setShowManual] = useState(false);

  // Step 1
  const [hasCFE, setHasCFE] = useState('');
  const [planCFE, setPlanCFE] = useState('');
  const [usoCasaNegocio, setUsoCasaNegocio] = useState('');
  const [numPersonasCasa, setNumPersonasCasa] = useState('');
  const [rangoPersonasNegocio, setRangoPersonasNegocio] = useState('');

  const [pago, setPago] = useState('');
  const [periodo, setPeriodo] = useState<'bimestral' | 'mensual'>('bimestral');
  const [tarifa, setTarifa] = useState('');
  const [cp, setCP] = useState('');
  const [expand, setExpand] = useState('');
  const [showError, setShowError] = useState(false);

  // Step 2
  const [cargas, setCargas] = useState<string[]>([]);
  const [cargaDetalles, setCargaDetalles] = useState<{
    ev?: { modelo: string; km: string };
    minisplit?: { cantidad: string; horas: string };
  }>({});
  const [tipoInmueble, setTipoInmueble] = useState('');
  const [pisos, setPisos] = useState('');
  const [notas, setNotas] = useState('');

  // Step 3
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [uso, setUso] = useState('');
  const [privacidad, setPrivacidad] = useState(false);
  const [telError, setTelError] = useState<string>('');

  const [showResultModal, setShowResultModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Calculando tu propuesta…');

  const isNoCFEPlanningFlow = hasCFE === 'no' && planCFE === 'si';
  const isNoCFENoPlanning = hasCFE === 'no' && (planCFE === 'no' || planCFE === 'aislado');

  function showLoading(msg = 'Calculando tu propuesta…') {
    setLoadingMsg(msg);
    setLoading(true);
    try { window.parent.postMessage({ type: 'status', status: 'processing' }, '*'); } catch {}
  }
  function hideLoading() {
    setLoading(false);
    try { window.parent.postMessage({ type: 'status', status: 'done' }, '*'); } catch {}
  }

  // ---------- Helpers ----------
  const fileTooBig = (f: File) => f.size > 12 * 1024 * 1024; // 12MB cap p/evitar 502 por proxy

  const readFileAsDataURL = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('read_error'));
      fr.onload = () => resolve(String(fr.result || ''));
      fr.readAsDataURL(f);
    });

  // ---------- OCR Railway ----------
  async function runOCRRailway(selectedFiles: File[]) {
    if (!OCR_BASE) {
      setOcrStatus('fail');
      setOcrMsg('No se encontró el servicio de OCR. Revisa VITE_OCR_BASE.');
      return;
    }

    try {
      // Health check rápido (evita 502 por DNS/cold start largo)
      const hc = await fetch(`${OCR_BASE}/health`, { method: 'GET' }).catch(() => null);
      if (!hc || !hc.ok) {
        setOcrStatus('fail');
        setOcrMsg('El servicio de OCR no responde (health). Intenta más tarde o sube datos manualmente.');
        setOcrResult(null);
        return;
      }
    } catch {
      setOcrStatus('fail');
      setOcrMsg('El servicio de OCR no responde. Intenta más tarde o sube datos manualmente.');
      setOcrResult(null);
      return;
    }

    try {
      setOcrStatus('processing');
      setOcrMsg('Extrayendo información de tu recibo de CFE…');

      // Validación tamaño
      for (const f of selectedFiles) {
        if (fileTooBig(f)) {
          setOcrStatus('fail');
          setOcrMsg('Archivo demasiado grande (>12MB). Por favor sube un archivo más ligero.');
          setOcrResult(null);
          return;
        }
      }

      const fd = new FormData();
      selectedFiles.slice(0, 2).forEach(f => fd.append('files', f, f.name));

      // Timeout con AbortController (70s)
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 70000);

      let res: Response | null = null;
      let json: any = null;

      try {
        res = await fetch(`${OCR_BASE}/v1/ocr/cfe`, { method: 'POST', body: fd, signal: controller.signal });
        json = await res.json().catch(() => null);
      } catch (networkErr: any) {
        // Fallback directo a JSON endpoint (dataURLs) si hubo error de red/502
        const dataUrls = await Promise.all(selectedFiles.slice(0, 2).map(readFileAsDataURL));
        res = await fetch(`${OCR_BASE}/v1/ocr/cfe-json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: dataUrls, filename: selectedFiles[0]?.name || 'upload' }),
          signal: controller.signal
        });
        json = await res.json().catch(() => null);
      } finally {
        clearTimeout(t);
      }

      if (!res || !json) {
        setOcrStatus('fail');
        setOcrMsg('No pudimos procesar tu recibo. Sube una imagen más nítida o captura tus datos manualmente.');
        setOcrResult(null);
        return;
      }

      if (!res.ok || json.ok === false) {
        setOcrStatus('fail');
        setOcrMsg('No pudimos leer bien el recibo. Sube una imagen más nítida o captura tus datos manualmente.');
        setOcrResult(json);
        return;
      }

      // OK
      setOcrStatus('ok');
      setOcrMsg('¡Listo! Extrajimos correctamente los datos de tu recibo.');
      setOcrResult(json);

      if (!tarifa && json.form_overrides?.tarifa) setTarifa(String(json.form_overrides.tarifa).toUpperCase());
      if (!cp && json.form_overrides?.cp) setCP(String(json.form_overrides.cp));
      setHasCFE('si'); setPlanCFE(''); setShowManual(false);

    } catch (err) {
      console.warn('OCR error', err);
      setOcrStatus('fail');
      setOcrMsg('Error al procesar tu recibo. Intenta con una foto más clara o captura manualmente.');
      setOcrResult(null);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const next = [...selected].slice(0, 2);
    setFiles(next);
    setFileNames(next.map(f => f.name));
    await runOCRRailway(next);
  };

  const removeFileAt = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setFileNames(next.map(f => f.name));
    if (next.length === 0) {
      setOcrStatus('idle'); setOcrMsg(''); setOcrResult(null);
    }
  };

  const startManual = () => {
    setShowManual(true);
    setFiles([]); setFileNames([]);
    setOcrStatus('idle'); setOcrMsg(''); setOcrResult(null);
  };

  const handleCargaToggle = (carga: string, checked: boolean) => {
    if (checked) setCargas([...cargas, carga]);
    else {
      setCargas(cargas.filter(c => c !== carga));
      const d = { ...cargaDetalles };
      if (carga === 'ev') delete d.ev;
      if (carga === 'minisplit') delete d.minisplit;
      setCargaDetalles(d);
    }
  };

  const canProceedStep1 = () => {
    if (fileUploaded) return ocrStatus === 'ok';
    if (!showManual) return false;
    if (!hasCFE) return false;

    if (hasCFE === 'no') {
      if (!planCFE) return false;
      if (planCFE === 'no' || planCFE === 'aislado') return true;
      if (planCFE === 'si') {
        if (!usoCasaNegocio) return false;
        if (usoCasaNegocio === 'casa' && !numPersonasCasa) return false;
        if (usoCasaNegocio === 'negocio' && !rangoPersonasNegocio) return false;
        return true;
      }
    }

    if (hasCFE === 'si') {
      if (!pago || !tarifa || !cp || !expand) return false;
      const pagoNum = parseFloat(pago);
      const threshold = 2500;
      const bimestral = periodo === 'bimestral' ? pagoNum : pagoNum * 2;
      if (bimestral < threshold) return false;
    }
    return true;
  };

  const canProceedStep2 = () => {
    if (!tipoInmueble) return false;
    if (['2', '4', '5', '8'].includes(tipoInmueble) && !pisos) return false;
    if (cargas.includes('ev')) {
      if (!cargaDetalles.ev?.modelo || !cargaDetalles.ev?.km) return false;
    }
    if (cargas.includes('minisplit')) {
      if (!cargaDetalles.minisplit?.cantidad || !cargaDetalles.minisplit?.horas) return false;
    }
    return true;
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (fileUploaded) {
        if (ocrStatus === 'ok') { setCurrentStep(2); return; }
        return;
      }
      if (isNoCFENoPlanning || isNoCFEPlanningFlow) { setCurrentStep(3); return; }
    }
    if (currentStep < 3) setCurrentStep((currentStep + 1) as Step);
  };
  const prevStep = () => { if (currentStep > 1) setCurrentStep((currentStep - 1) as Step); };

  // Tel 10 dígitos
  useEffect(() => {
    const d = (telefono || '').replace(/\D/g, '');
    if (!telefono) setTelError('');
    else if (d.length !== 10) setTelError('El WhatsApp debe tener 10 dígitos (solo números).');
    else setTelError('');
  }, [telefono]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !correo || !telefono || !uso || !privacidad) return;

    const telDigits = (telefono || '').replace(/\D/g, '');
    if (telDigits.length !== 10) {
      setTelError('El WhatsApp debe tener 10 dígitos (solo números).');
      return;
    }

    const highValue = parseFloat(pago || '0') >= 50000;
    const industrialTariff = ['GDBT', 'GDMTH', 'GDMTO'].includes(tarifa);
    const noCFEPlan = isNoCFENoPlanning;

    let flow: 'AUTO' | 'MANUAL' | 'BLOCKED' = 'AUTO';
    let flow_reason = 'ok';
    if (industrialTariff) { flow = 'MANUAL'; flow_reason = 'tariff_business'; }
    else if (highValue)   { flow = 'MANUAL'; flow_reason = 'high_monthly'; }
    else if (noCFEPlan)   { flow = 'MANUAL'; flow_reason = 'no_cfe'; }

    setLoadingMsg('Calculando tu propuesta…');
    setLoading(true);

    const loads = cargaDetalles || {};
    const bridge = (window as any).SYBridge;
    const utms = (bridge?.getParentUtms?.() || {}) as any;
    const req_id = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : String(Date.now());

    const formPayload: any = {
      nombre, email: correo, telefono, uso,
      periodicidad: periodo || 'bimestral',
      pago_promedio_mxn: parseFloat(pago || '0') || 0,
      cp, tarifa: tarifa || '',
      tipo_inmueble: tipoInmueble || '',
      pisos: parseInt(pisos || '0', 10) || 0,
      notes: notas || '',
      loads,
      has_cfe: hasCFE !== 'no',
      plans_cfe: planCFE !== 'no' && planCFE !== 'aislado'
    };

    try {
      const res = await fetch(`${API_BASE}/api/cotizacion_v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          req_id, flow, flow_reason, utms,
          ocr: ocrResult || null,
          form: formPayload
        })
      });
      const json = await res.json();

      if (!res.ok || json.ok === false) throw new Error(json?.error || 'cotizacion_error');

      if (json.mode === 'AUTO' && json.pid) {
        bridge?.gtm?.('cotizador_v2_auto', { pid: json.pid });
        bridge?.navigate?.(`/propuesta-v2?pid=${encodeURIComponent(json.pid)}`, { proposal: json.proposal || null });
        return;
      }
      if (json.mode === 'MANUAL') {
        setLoading(false);
        bridge?.gtm?.('cotizador_v2_manual', { reason: json.reason || flow_reason });
        setShowContactModal(true);
        return;
      }
      if (json.mode === 'BLOCKED') {
        setLoading(false);
        bridge?.gtm?.('cotizador_v2_blocked', { reason: json.reason || flow_reason });
        alert('Por ahora no podemos procesar tu solicitud en automático.');
        return;
      }

      setLoading(false);
      setShowResultModal(true);

    } catch (err) {
      console.error(err);
      setLoading(false);
      alert('Ocurrió un error al procesar tu propuesta. Intenta de nuevo.');
    }
  };

  useEffect(() => {
    if (!showManual) return;
    const pagoNum = parseFloat(pago);
    const threshold = 2500;
    const bimestral = periodo === 'bimestral' ? pagoNum : pagoNum * 2;
    setShowError(bimestral > 0 && bimestral < threshold);
  }, [pago, periodo, showManual]);

  const progressPercentage = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: '#1e3a2b' }}>
            Calcula tu ahorro con SolarYa
          </h1>
          <p className="text-slate-600">Completa 3 sencillos pasos para obtener tu propuesta de sistema de paneles solares</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">Paso {currentStep} de 3</span>
            <span className="text-xs text-slate-500">{progressPercentage}% completado</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-500 ease-out"
                 style={{ width: `${progressPercentage}%`, backgroundImage: 'linear-gradient(90deg, #3cd070, #1e3a2b)' }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              {!showManual ? (
                <div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: '#1e3a2b' }}>Sube tu recibo de CFE</h2>
                  <p className="text-slate-600 mb-6">Te ayudamos a prellenar tus datos automáticamente</p>

                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:shadow-sm transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#3cd07022' }}>
                          <Upload className="w-8 h-8" style={{ color: '#3cd070' }} />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900 mb-1">Arrastra tu archivo o haz clic para subir (máx. 2)</p>
                          <p className="text-sm text-slate-500">PDF, JPG o PNG • Máx. 12MB c/u</p>
                        </div>
                      </div>
                    </label>

                    {fileUploaded && (
                      <div className="mt-4 flex flex-col items-center gap-2" style={{ color: '#3cd070' }}>
                        {fileNames.map((n, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">{n}</span>
                            <button onClick={() => removeFileAt(i)} className="text-xs underline text-slate-500 hover:text-slate-700">quitar</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {ocrStatus === 'processing' && (
                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-slate-300 rounded-full animate-spin" style={{ borderTopColor: '#1e3a2b' }}></div>
                      <p className="text-sm text-slate-700">{ocrMsg || 'Extrayendo información de tu recibo de CFE…'}</p>
                    </div>
                  )}
                  {ocrStatus === 'ok' && (
                    <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <p className="text-sm text-emerald-800">
                        {ocrMsg || 'Datos extraídos correctamente.'}
                        {!tarifa && ocrResult?.form_overrides?.tarifa ? <> (Tarifa sugerida: <strong>{String(ocrResult.form_overrides.tarifa)}</strong>)</> : null}
                        {!cp && ocrResult?.form_overrides?.cp ? <>, CP sugerido: <strong>{String(ocrResult.form_overrides.cp)}</strong></> : null}
                      </p>
                    </div>
                  )}
                  {ocrStatus === 'fail' && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-amber-800">{ocrMsg || 'No pudimos leer bien el recibo.'}</p>
                        <p className="text-xs text-amber-700 mt-2">
                          Sube una imagen más nítida, o <button className="underline" onClick={startManual}>captura tus datos manualmente</button>.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-slate-500">¿No tienes el archivo?</span>
                    </div>
                  </div>

                  <button
                    onClick={startManual}
                    className="w-full py-3 px-4 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all"
                  >
                    Capturar datos manualmente
                  </button>
                </div>
              ) : (
                <div>
                  {/* (…resto del step manual, sin cambios…) */}
                  {/* === OMITIDO POR BREVIDAD: es idéntico al que ya te compartí en la versión previa === */}
                </div>
              )}

              <div className="flex justify-end mt-8">
                <button
                  onClick={nextStep}
                  disabled={!canProceedStep1()}
                  className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ background: '#3cd070' }}
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* === Step 2 y Step 3 quedan igual que la versión anterior que ya funciona en tu app === */}
          {/* (Los mantengo idénticos para no romper nada; si los necesitas completos otra vez, me dices y los vuelvo a pegar.) */}
        </div>
      </div>

      {/* Modals y overlay de carga (sin cambios materiales) */}
      {/* … */}
    </div>
  );
}

export default App;
