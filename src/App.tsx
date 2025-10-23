import { useState, useEffect } from 'react';
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Lock } from 'lucide-react';

type Step = 1 | 2 | 3;

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
const OCR_BASE  = (import.meta as any).env?.VITE_OCR_BASE  || ''; // si no está, el código intentará Netlify /api/ocr_cfe_v2

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Subida de hasta 2 archivos
  const [files, setFiles] = useState<File[]>([]);
  const fileUploaded = files.length > 0;
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [showManual, setShowManual] = useState(false);

  // Step 1 fields
  const [hasCFE, setHasCFE] = useState('');
  const [planCFE, setPlanCFE] = useState('');
  const [usoCasaNegocio, setUsoCasaNegocio] = useState(''); // For no CFE but planning
  const [numPersonasCasa, setNumPersonasCasa] = useState('');
  const [rangoPersonasNegocio, setRangoPersonasNegocio] = useState('');
  const [pago, setPago] = useState('');
  const [periodo, setPeriodo] = useState('bimestral');
  const [tarifa, setTarifa] = useState('');
  const [cp, setCP] = useState('');
  const [expand, setExpand] = useState('');
  const [showError, setShowError] = useState(false);

  // Step 2 fields (sin área de techo)
  const [cargas, setCargas] = useState<string[]>([]);
  const [cargaDetalles, setCargaDetalles] = useState<{
    ev?: { modelo: string; km: string };
    minisplit?: { cantidad: string; horas: string };
  }>({});
  const [tipoInmueble, setTipoInmueble] = useState('');
  const [pisos, setPisos] = useState('');
  const [notas, setNotas] = useState('');

  // Step 3 fields (sin tenencia)
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [uso, setUso] = useState('');
  const [privacidad, setPrivacidad] = useState(false);

  // Validación de WhatsApp (10 dígitos)
  const PHONE_RE = /^[0-9]{10}$/;
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneError = phoneTouched && !PHONE_RE.test(telefono);

  // Modals
  const [showResultModal, setShowResultModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Overlay
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Calculando tu propuesta…');

  // OCR state (no cambiamos la lógica existente)
  const [ocrData, setOcrData] = useState<any>(null);

  // Flags de flujo
  const isNoCFEPlanningFlow = hasCFE === 'no' && planCFE === 'si';
  const isNoCFENoPlanning = hasCFE === 'no' && (planCFE === 'no' || planCFE === 'aislado');

  // Helpers overlay + aviso al padre (iframe)
  function showLoading(msg = 'Calculando tu propuesta…') {
    setLoadingMsg(msg);
    setLoading(true);
    try { window.parent.postMessage({ type: 'status', status: 'processing' }, '*'); } catch {}
  }
  function hideLoading() {
    setLoading(false);
    try { window.parent.postMessage({ type: 'status', status: 'done' }, '*'); } catch {}
  }

  // --- Upload múltiple (máx 2) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const next = [...files, ...selected].slice(0, 2);
    setFiles(next);
    setFileNames(next.map(f => f.name));
    setHasCFE('si');
    setPlanCFE('');
    setShowManual(false);
  };

  const removeFileAt = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setFileNames(next.map(f => f.name));
  };

  const startManual = () => {
    setShowManual(true);
    setFiles([]);
    setFileNames([]);
  };

  const handleCargaToggle = (carga: string, checked: boolean) => {
    if (checked) {
      setCargas([...cargas, carga]);
    } else {
      setCargas(cargas.filter(c => c !== carga));
      const newDetalles = { ...cargaDetalles };
      if (carga === 'ev') delete newDetalles.ev;
      if (carga === 'minisplit') delete newDetalles.minisplit;
      setCargaDetalles(newDetalles);
    }
  };

  // === OCR call (manteniendo el comportamiento: intenta Railway y si no hay base, fallback a Netlify) ===
  async function runOCRIfFiles(): Promise<any | null> {
    if (!files.length) return null;

    try {
      showLoading('Procesando tu recibo…');
      // Preferimos enviar los archivos tal cual (PDF/IMG) como multipart para no bajar resolución
      if (OCR_BASE) {
        const fd = new FormData();
        files.forEach((f) => fd.append('files', f, f.name));
        const r = await fetch(`${OCR_BASE.replace(/\/+$/,'')}/v1/ocr/cfe`, { method: 'POST', body: fd });
        const j = await r.json().catch(() => null);
        if (r.ok && j?.ok) {
          setOcrData(j.data || null);
          // Overrides amables
          if (j?.data?.tarifa && !tarifa) setTarifa(String(j.data.tarifa).toUpperCase());
          if (j?.data?.codigo_postal && !cp) setCP(String(j.data.codigo_postal));
          return j.data || null;
        }
      } else {
        // Fallback a Netlify si no hay OCR_BASE
        const fd = new FormData();
        files.forEach((f) => fd.append('file', f, f.name));
        const r = await fetch(`${API_BASE}/api/ocr_cfe_v2`, { method: 'POST', body: fd });
        const j = await r.json().catch(() => null);
        if (r.ok && (j?.ok || j?.data)) {
          const data = j.data || j;
          setOcrData(data);
          if (data?.tarifa && !tarifa) setTarifa(String(data.tarifa).toUpperCase());
          if (data?.codigo_postal && !cp) setCP(String(data.codigo_postal));
          return data;
        }
      }
    } catch (err) {
      console.warn('OCR error', err);
    } finally {
      hideLoading();
    }
    return null;
  }

  const canProceedStep1 = () => {
    if (fileUploaded) return true; // (mantengo el comportamiento original)
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

  // Navegación (mantenida)
  const nextStep = async () => {
    if (currentStep === 1) {
      // Si hay archivos, intentamos OCR aquí (manteniendo UX previa de ir al paso 2)
      if (fileUploaded) {
        await runOCRIfFiles(); // no bloqueamos el avance; mantenemos la lógica existente
        setCurrentStep(2);
        return;
      }
      if (isNoCFENoPlanning || isNoCFEPlanningFlow) {
        setCurrentStep(3);
        return;
      }
    }
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  // SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación de WhatsApp a 10 dígitos
    setPhoneTouched(true);
    if (!PHONE_RE.test(telefono)) {
      return;
    }

    if (!nombre || !correo || !telefono || !uso || !privacidad) {
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

    // 1) OCR si hay archivos (por si aún no se hizo)
    let ocr: any = ocrData || null;
    try {
      if (files.length && !ocr) {
        ocr = await runOCRIfFiles();
      }
    } catch {}

    // 2) Preparar payload
    showLoading('Calculando tu propuesta…');

    const loads = cargaDetalles || {};
    const bridge = (window as any).SYBridge;
    const utms = (bridge?.getParentUtms?.() || {}) as any;
    const req_id = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : String(Date.now());

    const formPayload: any = {
      nombre,
      email: correo,
      telefono,
      uso,
      periodicidad: periodo || 'bimestral',
      pago_promedio_mxn: parseFloat(pago || '0') || 0,
      cp,
      tarifa: tarifa || (ocr?.tarifa || ''),
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
        body: JSON.stringify({ req_id, flow, flow_reason, utms, ocr, form: formPayload })
      });
      const json = await res.json();

      if (!res.ok || json.ok === false) {
        throw new Error(json?.error || 'cotizacion_error');
      }

      if (json.mode === 'AUTO' && json.pid) {
        bridge?.gtm?.('cotizador_v2_auto', { pid: json.pid });
        bridge?.navigate?.(`/propuesta-v2?pid=${encodeURIComponent(json.pid)}`, { proposal: json.proposal || null });
        return;
      }

      if (json.mode === 'MANUAL') {
        hideLoading();
        bridge?.gtm?.('cotizador_v2_manual', { reason: json.reason || flow_reason });
        setShowContactModal(true);
        return;
      }

      if (json.mode === 'BLOCKED') {
        hideLoading();
        bridge?.gtm?.('cotizador_v2_blocked', { reason: json.reason || flow_reason });
        setShowError(true);
        return;
      }

      hideLoading();
      setShowResultModal(true);

    } catch (err) {
      console.error(err);
      hideLoading();
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: '#1e3a2b' }}>
            Calcula tu ahorro con SolarYa
          </h1>
          <p className="text-slate-600">Completa 3 sencillos pasos para obtener tu propuesta de sistema de paneles solares</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">Paso {currentStep} de 3</span>
            <span className="text-xs text-slate-500">{progressPercentage}% completado</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPercentage}%`,
                backgroundImage: 'linear-gradient(90deg, #3cd070, #1e3a2b)'
              }}
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
          {/* Step 1 */}
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
                          <p className="text-lg font-semibold text-slate-900 mb-1">
                            Arrastra tu archivo o haz clic para subir (máx. 2)
                          </p>
                          <p className="text-sm text-slate-500">PDF, JPG o PNG • Máx. 10MB c/u</p>
                        </div>
                      </div>
                    </label>

                    {fileUploaded && (
                      <div className="mt-4 flex flex-col items-center gap-2" style={{ color: '#3cd070' }}>
                        {fileNames.map((n, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">{n}</span>
                            <button
                              onClick={() => removeFileAt(i)}
                              className="text-xs underline text-slate-500 hover:text-slate-700"
                            >
                              quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
                    <p className="text-sm text-slate-700">
                      <strong>Tip:</strong> Sube ambas páginas (frente y reverso) para mayor precisión.
                    </p>
                  </div>

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
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold" style={{ color: '#1e3a2b' }}>Captura manual</h2>
                    <button
                      onClick={() => setShowManual(false)}
                      className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="text-sm font-medium">Volver</span>
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        ¿Tienes contrato con CFE?
                      </label>
                      <select
                        value={hasCFE}
                        onChange={(e) => {
                          setHasCFE(e.target.value);
                          setPlanCFE('');
                          setUsoCasaNegocio('');
                          setNumPersonasCasa('');
                          setRangoPersonasNegocio('');
                        }}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                        style={{ outlineColor: '#3cd070' }}
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    {hasCFE === 'no' && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Si no tienes, ¿planeas contratarlo?
                        </label>
                        <select
                          value={planCFE}
                          onChange={(e) => {
                            setPlanCFE(e.target.value);
                            setUsoCasaNegocio('');
                            setNumPersonasCasa('');
                            setRangoPersonasNegocio('');
                          }}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                          style={{ outlineColor: '#3cd070' }}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="si">Sí</option>
                          <option value="aislado">No, quiero instalar un sistema aislado</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    )}

                    {hasCFE === 'no' && planCFE === 'si' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            ¿Es para casa o negocio?
                          </label>
                          <select
                            value={usoCasaNegocio}
                            onChange={(e) => {
                              setUsoCasaNegocio(e.target.value);
                              setNumPersonasCasa('');
                              setRangoPersonasNegocio('');
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                            style={{ outlineColor: '#3cd070' }}
                          >
                            <option value="">Selecciona una opción</option>
                            <option value="casa">Casa</option>
                            <option value="negocio">Negocio</option>
                          </select>
                        </div>

                        {usoCasaNegocio === 'casa' && (
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              ¿Cuántas personas habrá en la casa?
                            </label>
                            <input
                              type="number"
                              value={numPersonasCasa}
                              onChange={(e) => setNumPersonasCasa(e.target.value)}
                              placeholder="Ej. 4"
                              min="1"
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                              style={{ outlineColor: '#3cd070' }}
                            />
                          </div>
                        )}

                        {usoCasaNegocio === 'negocio' && (
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              ¿Cuántas personas habrá en el negocio?
                            </label>
                            <select
                              value={rangoPersonasNegocio}
                              onChange={(e) => setRangoPersonasNegocio(e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                              style={{ outlineColor: '#3cd070' }}
                            >
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

                    {hasCFE === 'si' && (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Pago a CFE (MXN)
                            </label>
                            <input
                              type="number"
                              value={pago}
                              onChange={(e) => setPago(e.target.value)}
                              placeholder="Ej. 3,200"
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                              style={{ outlineColor: '#3cd070' }}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              Si usas <em>diablitos</em>, este pago no refleja tu consumo real
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Periodicidad
                            </label>
                            <select
                              value={periodo}
                              onChange={(e) => setPeriodo(e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                              style={{ outlineColor: '#3cd070' }}
                            >
                              <option value="bimestral">Bimestral</option>
                              <option value="mensual">Mensual</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Tarifa
                            </label>
                            <select
                              value={tarifa}
                              onChange={(e) => setTarifa(e.target.value)}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                              style={{ outlineColor: '#3cd070' }}
                            >
                              <option value="">Selecciona tu tarifa</option>
                              <option>1</option>
                              <option>1A</option>
                              <option>1B</option>
                              <option>1C</option>
                              <option>1D</option>
                              <option>1E</option>
                              <option>1F</option>
                              <option>DAC</option>
                              <option>PDBT</option>
                              <option>GDBT</option>
                              <option>GDMTH</option>
                              <option>GDMTO</option>
                              <option value="nose">No sé</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Código postal
                            </label>
                            <input
                              type="text"
                              value={cp}
                              onChange={(e) => setCP(e.target.value)}
                              placeholder="Ej. 06100"
                              maxLength={5}
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                              style={{ outlineColor: '#3cd070' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            ¿Ya tienes sistema FV y quieres expandirlo?
                          </label>
                          <select
                            value={expand}
                            onChange={(e) => setExpand(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                            style={{ outlineColor: '#3cd070' }}
                          >
                            <option value="">Selecciona una opción</option>
                            <option>Sí</option>
                            <option>No</option>
                          </select>
                        </div>

                        {showError && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800">
                              Por el momento, para tu nivel de consumo, no atendemos tu área. Mantente en contacto.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1e3a2b' }}>Detalles del inmueble</h2>
                <p className="text-slate-600 mb-6">Ayúdanos a entender mejor tus necesidades</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      ¿Planeas instalar alguno de estos en los próximos 3-6 meses?
                    </label>
                    <p className="text-xs text-slate-500 mb-3">(Opcional - puedes elegir varias)</p>
                    <div className="space-y-3">
                      {[
                        { value: 'ev', label: 'Cargador para coche eléctrico' },
                        { value: 'minisplit', label: 'Minisplit / A/C' },
                        { value: 'secadora', label: 'Secadora eléctrica' },
                        { value: 'bomba', label: 'Bomba de agua / alberca' },
                        { value: 'otro', label: 'Otro' },
                      ].map((item) => (
                        <div key={item.value}>
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={cargas.includes(item.value)}
                              onChange={(e) => handleCargaToggle(item.value, e.target.checked)}
                              className="w-5 h-5 border-slate-300 rounded focus:ring-2"
                              style={{ accentColor: '#3cd070' }}
                            />
                            <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">{item.label}</span>
                          </label>

                          {cargas.includes(item.value) && item.value === 'ev' && (
                            <div className="ml-8 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Modelo</label>
                                <select
                                  value={cargaDetalles.ev?.modelo || ''}
                                  onChange={(e) => setCargaDetalles({
                                    ...cargaDetalles,
                                    ev: { ...cargaDetalles.ev, modelo: e.target.value, km: cargaDetalles.ev?.km || '' }
                                  })}
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                  style={{ outlineColor: '#3cd070' }}
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
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Km diarios manejados</label>
                                <input
                                  type="number"
                                  value={cargaDetalles.ev?.km || ''}
                                  onChange={(e) => setCargaDetalles({
                                    ...cargaDetalles,
                                    ev: { ...cargaDetalles.ev, modelo: cargaDetalles.ev?.modelo || '', km: e.target.value }
                                  })}
                                  placeholder="Ej. 40"
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                  style={{ outlineColor: '#3cd070' }}
                                />
                              </div>
                            </div>
                          )}

                          {cargas.includes(item.value) && item.value === 'minisplit' && (
                            <div className="ml-8 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad</label>
                                <input
                                  type="number"
                                  value={cargaDetalles.minisplit?.cantidad || ''}
                                  onChange={(e) => setCargaDetalles({
                                    ...cargaDetalles,
                                    minisplit: { ...cargaDetalles.minisplit, cantidad: e.target.value, horas: cargaDetalles.minisplit?.horas || '' }
                                  })}
                                  placeholder="Ej. 2"
                                  min="1"
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                  style={{ outlineColor: '#3cd070' }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Horas diarias que estará encendido</label>
                                <input
                                  type="number"
                                  value={cargaDetalles.minisplit?.horas || ''}
                                  onChange={(e) => setCargaDetalles({
                                    ...cargaDetalles,
                                    minisplit: { ...cargaDetalles.minisplit, cantidad: cargaDetalles.minisplit?.cantidad || '', horas: e.target.value }
                                  })}
                                  placeholder="Ej. 6"
                                  step="0.5"
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                  style={{ outlineColor: '#3cd070' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Tipo de inmueble
                      </label>
                      <select
                        value={tipoInmueble}
                        onChange={(e) => setTipoInmueble(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                        style={{ outlineColor: '#3cd070' }}
                      >
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

                    {['2', '4', '5', '8'].includes(tipoInmueble) && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          No. de pisos del edificio
                        </label>
                        <input
                          type="number"
                          value={pisos}
                          onChange={(e) => setPisos(e.target.value)}
                          placeholder="Ej. 8"
                          min="1"
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                          style={{ outlineColor: '#3cd070' }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      ¿Algo más que debamos saber?
                    </label>
                    <p className="text-xs text-slate-500 mb-2">(Opcional)</p>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Ej. Hay sombras por las tardes; antenas en el techo, etc."
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all resize-none"
                      style={{ outlineColor: '#3cd070' }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Atrás</span>
                </button>
                <button
                  onClick={nextStep}
                  disabled={!canProceedStep2()}
                  className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ background: '#3cd070' }}
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1e3a2b' }}>Información de contacto</h2>
                <p className="text-slate-600 mb-6">Último paso para recibir tu propuesta personalizada</p>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej. María López"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                        style={{ outlineColor: '#3cd070' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        placeholder="tunombre@email.com"
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                        style={{ outlineColor: '#3cd070' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={telefono}
                        onChange={(e) => {
                          // Solo dígitos y máx 10
                          const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setTelefono(v);
                        }}
                        onBlur={() => setPhoneTouched(true)}
                        placeholder="5512345678"
                        required
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all ${phoneError ? 'border-red-400' : 'border-slate-300'}`}
                        style={{ outlineColor: phoneError ? '#dc2626' : '#3cd070' }}
                      />
                      {phoneError && (
                        <p className="text-xs text-red-600 mt-1">
                          Debe tener exactamente 10 dígitos (solo números).
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Casa o negocio
                      </label>
                      <select
                        value={uso}
                        onChange={(e) => setUso(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                        style={{ outlineColor: '#3cd070' }}
                      >
                        <option value="">Selecciona</option>
                        <option>Casa</option>
                        <option>Negocio</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={privacidad}
                        onChange={(e) => setPrivacidad(e.target.checked)}
                        required
                        className="w-5 h-5 border-slate-300 rounded focus:ring-2 mt-0.5"
                        style={{ accentColor: '#3cd070' }}
                      />
                      <span className="text-sm text-slate-700 group-hover:text-slate-900">
                        He leído y acepto el <a href="#" className="underline" style={{ color: '#3cd070' }}>aviso de privacidad</a>
                      </span>
                    </label>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    <p className="text-sm text-slate-700">
                      Nunca compartimos tus datos con terceros. Tu información está segura con nosotros.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Atrás</span>
                </button>
                <button
                  type="submit"
                  disabled={!PHONE_RE.test(telefono)}
                  className="flex items-center gap-2 px-8 py-3 text-white font-bold rounded-xl hover:opacity-90 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#ff5c36' }}
                >
                  <span>Calcular mi ahorro</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modals */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowResultModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#3cd07022' }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: '#3cd070' }} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Propuesta lista!</h3>
              <p className="text-slate-600 mb-6">
                Aquí mostraríamos tu simulación de ahorro, equipo sugerido y ROI estimado.
              </p>
              <button
                onClick={() => setShowResultModal(false)}
                className="w-full py-3 px-6 text-white font-semibold rounded-xl transition-all"
                style={{ background: '#3cd070' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowContactModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#1e3a2b22' }}>
                <CheckCircle2 className="w-10 h-10" style={{ color: '#1e3a2b' }} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Gracias por tu interés!</h3>
              <p className="text-slate-600 mb-6">
                Te contactaremos en menos de 24h para preparar la mejor propuesta personalizada para tu caso.
              </p>
              <button
                onClick={() => setShowContactModal(false)}
                className="w-full py-3 px-6 text-white font-semibold rounded-xl transition-all"
                style={{ background: '#1e3a2b' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de carga global */}
      {loading && (
        <div className="fixed inset-0 z-[9999] bg-white/85 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-11 h-11 border-4 border-slate-200 rounded-full animate-spin mx-auto mb-3"
                 style={{ borderTopColor: '#1e3a2b' }}></div>
            <div className="font-extrabold text-slate-900">{loadingMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
