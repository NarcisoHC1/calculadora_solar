import { useState, useEffect } from 'react';
import { ProposalData, DualProposal } from './types';
import { X, Zap, TrendingDown, TreePine, Calendar, Shield, Plus, Minus, Download, CheckCircle2, Clock } from 'lucide-react';

interface ProposalProps {
  proposal: DualProposal;
  onClose: () => void;
  userName: string;
}

function formatCurrency(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) {
    amount = 0;
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function safeToFixed(value: number, decimals: number): string {
  if (!isFinite(value) || isNaN(value)) {
    return '0';
  }
  return value.toFixed(decimals);
}

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

function openCalendlyPopup(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  if (window.Calendly) {
    window.Calendly.initPopupWidget({ url: 'https://calendly.com/narciso-solarya/30min' });
  }
}

function getComponentSpecs(concepto: string, marca: string, modelo: string): string[] {
  const conceptoLower = concepto.toLowerCase();

  if (conceptoLower.includes('panel')) {
    const watts = modelo.match(/(\d+)w/i)?.[1] || '555';
    return [
      `Potencia: ${watts}W`,
      'Tecnología: Monocristalino N-Type',
      'Eficiencia: hasta 22.8%',
      'Dimensiones: 2278mm × 1134mm × 35mm',
      'Garantía: **25 años**'
    ];
  }

  if (conceptoLower.includes('microinversor')) {
    const mppt = modelo.match(/(\d)mppt/i)?.[1] || '2';
    return [
      `Entradas: ${mppt} MPPT`,
      'Eficiencia: 97.3%',
      'Garantía: **12 años**'
    ];
  }

  if (conceptoLower.includes('inversor')) {
    const kw = modelo.match(/(\d+)kw/i)?.[1] || '10';
    return [
      `Potencia: ${kw}kW`,
      'Eficiencia: 98.6%',
      'Garantía: **12 años**'
    ];
  }

  if (conceptoLower.includes('montaje') || conceptoLower.includes('estructura')) {
    return [
      'Material: Aluminio grado industrial',
      'Certificación antisísmica',
      'Resistente a corrosión',
      'Garantía: **25 años**'
    ];
  }

  return [];
}

function CalendlyWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <div className="mt-6">
        <div
          className="calendly-inline-widget"
          data-url="https://calendly.com/narciso-solarya/30min"
          style={{ minWidth: '320px', height: '700px' }}
        />
      </div>
      <div className="print-cta mt-6 text-center">
        <a
          href="https://calendly.com/narciso-solarya/30min"
          className="inline-block px-12 py-5 rounded-xl font-bold text-xl shadow-2xl mb-4"
          style={{ background: '#ff5c36', color: 'white' }}
        >
          Agendar Visita Técnica Gratuita
        </a>
        <p className="text-sm text-slate-500">Visita: calendly.com/narciso-solarya/30min</p>
      </div>
    </>
  );
}

function ProposalCard({ data, title, onClose, showSharedSections = true }: { data: ProposalData; title: string; onClose: () => void; showSharedSections?: boolean }) {
  const { system, financial, environmental, components, porcentajeCobertura, showDACWarning, dacBimonthlyPayment, dacFinancial } = data;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-6 md:p-8">
        <h3 className="text-2xl font-bold mb-6" style={{ color: '#1e3a2b' }}>{title}</h3>

        <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
          <div className="flex items-center justify-center mb-4">
            <TrendingDown className="w-5 h-5" style={{ color: '#ff5c36' }} />
            <h4 className="text-base font-bold text-slate-900 ml-2">Tu Ahorro con SolarYa</h4>
          </div>

          <div className="flex items-center justify-center gap-6 mb-5 flex-wrap">
            <div className="text-center">
              <div className="text-xs font-semibold text-slate-600 mb-1">PAGAS AHORA A CFE</div>
              <div className="text-3xl font-bold text-slate-700 line-through">{formatCurrency(financial.pagoAhora)}</div>
            </div>
            <div className="text-4xl font-bold" style={{ color: '#ff5c36' }}>→</div>
            <div className="text-center">
              <div className="text-xs font-semibold text-slate-600 mb-1">CON SOLARYA PAGARÁS</div>
              <div className="text-3xl font-bold" style={{ color: '#3cd070' }}>{formatCurrency(financial.pagoFuturo)}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 text-center border-2" style={{ borderColor: '#ff9b7a' }}>
            <p className="text-xs font-semibold text-slate-600 mb-1">AHORRAS CADA BIMESTRE</p>
            <p className="text-4xl font-bold" style={{ color: '#ff5c36' }}>
              {formatCurrency(financial.ahorroBimestral)}
            </p>
          </div>
        </div>

        {showDACWarning && dacBimonthlyPayment && dacFinancial && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <p className="text-sm font-bold text-amber-900 mb-3">⚠️ Advertencia Tarifa DAC</p>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Tu consumo bimestral de energía es alto y de seguir así los siguientes meses, la CFE podría pasarte a tarifa DAC (tarifa residencial de alto consumo).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Si caes en tarifa DAC, tu pago será de <strong>{formatCurrency(dacBimonthlyPayment)}</strong> al bimestre.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Con SolarYa evitarás caer en DAC, ahorrando <strong>{formatCurrency(dacBimonthlyPayment - financial.pagoFuturo)}</strong> al bimestre.</span>
              </li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#ff5c36' }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Tu Sistema Solar</h5>
            </div>
            <p className="text-3xl font-bold mb-2" style={{ color: '#1e3a2b' }}>{safeToFixed(system.potenciaTotal / 1000, 1)} kilowatts</p>
            <div className="space-y-1 text-sm text-slate-600">
              <p><strong className="text-slate-900">{system.numPaneles}</strong> paneles solares de <strong className="text-slate-900">{system.potenciaPorPanel}</strong> watts c/u</p>
              <p>Energía generada: <strong className="text-slate-900">{Math.round(system.generacionMensualKwh * 2)}</strong> kWh/bimestre</p>
              <p>Generas el <strong className="text-slate-900">{safeToFixed(porcentajeCobertura, 0)}%</strong> de tu consumo</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#1e3a2b' }}>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Retorno de Inversión</h5>
            </div>
            <p className="text-3xl font-bold mb-2" style={{ color: '#1e3a2b' }}>{safeToFixed(financial.anosRetorno, 1)} años</p>
            <div className="space-y-1 text-sm text-slate-600">
              <p>Ahorro en 25 años:</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(financial.ahorroBimestral * 6 * 25)}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h4 className="text-lg font-bold text-slate-900 mb-4">Tu Inversión</h4>
          <div className="bg-slate-50 rounded-xl p-5 space-y-2 border border-slate-200">
            <div className="flex justify-between text-slate-700">
              <span>Precio de lista:</span>
              <span className="font-semibold">{formatCurrency(financial.precioLista)}</span>
            </div>
            <div className="flex justify-between font-semibold" style={{ color: '#3cd070' }}>
              <span>Descuento (10%):</span>
              <span>-{formatCurrency(financial.descuento)}</span>
            </div>
            <div className="flex justify-between text-slate-700 border-t pt-2">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(financial.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>IVA:</span>
              <span className="font-semibold">{formatCurrency(financial.iva)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t" style={{ color: '#1e3a2b' }}>
              <span>INVERSIÓN TOTAL</span>
              <span>{formatCurrency(financial.total)}</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
            <p className="text-sm font-bold text-slate-900 mb-3">Pago en 3 exhibiciones:</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-600 mb-1">Anticipo 50%</p>
                <p className="text-lg font-bold" style={{ color: '#1e3a2b' }}>{formatCurrency(financial.total * 0.5)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">2do pago 25%</p>
                <p className="text-lg font-bold" style={{ color: '#1e3a2b' }}>{formatCurrency(financial.total * 0.25)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">3er pago 25%</p>
                <p className="text-lg font-bold" style={{ color: '#1e3a2b' }}>{formatCurrency(financial.total * 0.25)}</p>
              </div>
            </div>
          </div>

        </div>

        {showSharedSections && (
          <div className="mt-6 border-t border-slate-200 pt-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
              <h4 className="text-2xl md:text-3xl font-bold text-center" style={{ color: '#1e3a2b' }}>
                Da el Siguiente Paso Hacia Tu Independencia Energética
              </h4>
              <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
            </div>
            <p className="text-center text-slate-600 mb-4 max-w-3xl mx-auto leading-relaxed">
              Agenda tu visita técnica <strong>100% GRATUITA</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
            </p>
            <p className="text-center text-slate-700 font-semibold mb-6 text-lg">
              Selecciona la fecha y hora que mejor te convenga
            </p>
            <CalendlyWidget />
            <p className="text-xs text-slate-500 mt-4 text-center">Sin compromiso · Evaluación profesional · 100% gratis</p>
          </div>
        )}

        {showSharedSections && (
        <div className="border-t border-slate-200 pt-6 mb-6">
          <h4 className="text-xl font-bold text-slate-900 mb-6">¿Qué Obtienes con Tu Sistema Solar?</h4>

          <div className="bg-slate-50 border-2 rounded-xl p-6 mb-6" style={{ borderColor: '#ff9b7a' }}>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <p>Instalación por técnicos certificados</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <p>Garantía de instalación: <strong>2 años</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <p>Todos los trámites ante CFE</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <p>Garantía de equipos: <strong>12 años</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <p>App de monitoreo de energía en tiempo real</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <p>Garantía de generación de energía: <strong>25 años</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <p>Aumenta el valor de tu propiedad</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <p>Protección contra subidas de precios de CFE</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border-2 rounded-xl p-4 max-w-2xl mx-auto" style={{ borderColor: '#ff9b7a' }}>
            <h5 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TreePine className="w-4 h-4" style={{ color: '#3cd070' }} />
              Instalar tu sistema de paneles solares equivale anualmente a:
            </h5>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl mb-1">🌳</div>
                <p className="text-xl font-bold" style={{ color: '#1e3a2b' }}>{environmental.arboles}</p>
                <p className="text-xs text-slate-600 mt-0.5">árboles plantados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🛢️</div>
                <p className="text-xl font-bold" style={{ color: '#1e3a2b' }}>{environmental.barrilesPetroleo}</p>
                <p className="text-xs text-slate-600 mt-0.5">barriles de petróleo evitados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">☁️</div>
                <p className="text-xl font-bold" style={{ color: '#1e3a2b' }}>{environmental.toneladasCO2}</p>
                <p className="text-xs text-slate-600 mt-0.5">toneladas de CO₂ reducidas</p>
              </div>
            </div>
          </div>
        </div>
        )}

        <div className="border-t border-slate-200 pt-6">
          <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-700" />
            Componentes del Sistema
          </h4>
          <div className="space-y-3">
            {components.map((comp, idx) => {
              const specs = getComponentSpecs(comp.concepto, comp.marca, comp.modelo);
              return (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{comp.concepto}</p>
                      <p className="text-sm text-slate-600 mt-1">{comp.marca} · {comp.modelo}</p>
                      {specs.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {specs.map((spec, specIdx) => (
                            <p key={specIdx} className="text-xs text-slate-600" dangerouslySetInnerHTML={{ __html: `• ${spec.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}` }} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xl font-bold" style={{ color: '#ff5c36' }}>×{comp.cantidad}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Nota:</strong> Esta es una cotización preliminar basada en la información proporcionada.
            El precio final se ajustará tras la visita técnica gratuita donde validaremos las condiciones específicas de tu instalación.
          </p>
        </div>
      </div>
    </div>
  );
}

function SharedSections({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
        <div className="border-b border-slate-200 pb-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
            <h4 className="text-2xl md:text-3xl font-bold text-center" style={{ color: '#1e3a2b' }}>
              Da el Siguiente Paso Hacia Tu Independencia Energética
            </h4>
            <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
          </div>
          <p className="text-center text-slate-600 mb-4 max-w-3xl mx-auto leading-relaxed">
            Agenda tu visita técnica <strong>100% GRATUITA</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
          </p>
          <p className="text-center text-slate-700 font-semibold mb-6 text-lg">
            Selecciona la fecha y hora que mejor te convenga
          </p>
          <CalendlyWidget />
          <p className="text-xs text-slate-500 mt-4 text-center">Sin compromiso · Evaluación profesional · 100% gratis</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
        <h4 className="text-xl font-bold text-slate-900 mb-4">Usamos Sólo las Mejores Marcas</h4>
        <p className="text-sm text-slate-600 mb-6">Líderes mundiales en tecnología solar</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border-2 rounded-xl p-5" style={{ borderColor: '#ff9b7a' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ background: '#ff5c36' }}>
                T1
              </div>
              <div>
                <h5 className="font-bold text-slate-900">Paneles Tier 1</h5>
                <p className="text-xs text-slate-600">Paneles Solares</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-700">
              <p>• Marca reconocida mundialmente</p>
              <p>• Máxima calidad y confiabilidad</p>
              <p>• Tecnología bifacial N-Type</p>
            </div>
          </div>

          <div className="bg-white border-2 rounded-xl p-5" style={{ borderColor: '#ff9b7a' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ background: '#1e3a2b' }}>
                H
              </div>
              <div>
                <h5 className="font-bold text-slate-900">Hoymiles</h5>
                <p className="text-xs text-slate-600">Microinversores</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-700">
              <p>• Líder global en microinversores</p>
              <p>• +5M unidades instaladas</p>
              <p>• Eficiencia hasta 97.3%</p>
            </div>
          </div>

          <div className="bg-white border-2 rounded-xl p-5" style={{ borderColor: '#ff9b7a' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ background: '#ff5c36' }}>
                H
              </div>
              <div>
                <h5 className="font-bold text-slate-900">Huawei</h5>
                <p className="text-xs text-slate-600">Inversores String</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-700">
              <p>• Líder mundial en inversores</p>
              <p>• Tecnología FusionSolar</p>
              <p>• Eficiencia hasta 98.6%</p>
            </div>
          </div>

          <div className="bg-white border-2 rounded-xl p-5" style={{ borderColor: '#ff9b7a' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ background: '#1e3a2b' }}>
                A
              </div>
              <div>
                <h5 className="font-bold text-slate-900">Aluminext</h5>
                <p className="text-xs text-slate-600">Sistema de Montaje</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-700">
              <p>• Fabricante mexicano premium</p>
              <p>• Aluminio grado industrial</p>
              <p>• Diseño antisísmico certificado</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href="https://calendly.com/narciso-solarya/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 shadow-lg"
            style={{ background: '#ff5c36', color: 'white' }}
          >
            Agendar visita técnica gratuita
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
        <h4 className="text-xl font-bold text-slate-900 mb-6">Proceso y Tiempos</h4>

        <div className="relative">
          <div className="absolute left-6 top-12 bottom-12 w-0.5" style={{ background: '#ff5c36' }}></div>

          <div className="space-y-8">
            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                1
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900">Visita Técnica</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~1 día
                  </span>
                </div>
                <p className="text-sm text-slate-700">Evaluación gratuita y propuesta final</p>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                2
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900">Contrato y Anticipo</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~1 día
                  </span>
                </div>
                <p className="text-sm text-slate-700">Firma y pago del 50%</p>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                3
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900">Instalación</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~5 días
                  </span>
                </div>
                <p className="text-sm text-slate-700">Sistema funcionando</p>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                4
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900">Interconexión CFE</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    2-4 semanas
                  </span>
                </div>
                <p className="text-sm text-slate-700">Trámites y medidor bidireccional</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-slate-50 border-2 rounded-xl p-4 text-center" style={{ borderColor: '#ff9b7a' }}>
          <p className="text-sm font-semibold" style={{ color: '#1e3a2b' }}>
            ⏱️ Tiempo total estimado: 4-6 semanas desde la visita hasta interconexión completa
          </p>
        </div>

        <div className="mt-6 text-center">
          <a
            href=""
            onClick={openCalendlyPopup}
            className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 shadow-lg cursor-pointer"
            style={{ background: '#ff5c36', color: 'white' }}
          >
            Agendar visita técnica gratuita
          </a>
          <p className="text-xs text-slate-500 mt-2">Agenda tu cita ahora · Sin compromiso</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
        <h3 className="text-2xl font-bold mb-6" style={{ color: '#1e3a2b' }}>Preguntas Frecuentes</h3>
        <FAQAccordion />

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-slate-700 mb-4">¿Tienes más preguntas? Hablemos</p>
          <a
            href=""
            onClick={openCalendlyPopup}
            className="inline-block px-8 py-3 rounded-xl font-bold transition-all hover:opacity-90 cursor-pointer"
            style={{ background: '#ff5c36', color: 'white' }}
          >
            Agendar visita técnica gratuita
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border-2 p-8 md:p-12 text-center" style={{ borderColor: '#ff9b7a' }}>
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1e3a2b' }}>
          Da el Primer Paso Hacia Tu Independencia Energética
        </h3>
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
          Agenda tu visita técnica <strong>100% gratuita</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
        </p>
        <a
          href=""
          onClick={openCalendlyPopup}
          className="inline-block px-12 py-5 rounded-xl font-bold text-xl transition-all hover:opacity-90 shadow-2xl mb-4 cursor-pointer"
          style={{ background: '#ff5c36', color: 'white' }}
        >
          Agendar Visita Técnica Gratuita
        </a>
        <p className="text-sm text-slate-500">Respuesta en menos de 24 horas · Sin letra pequeña</p>

        <div className="mt-8 flex items-center justify-center gap-8 flex-wrap text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
            <span>Sin compromiso</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
            <span>100% gratis</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
            <span>Respuesta rápida</span>
          </div>
        </div>
      </div>
    </>
  );
}

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: '¿Qué incluye exactamente el sistema?',
      answer: 'TODO INCLUIDO: Paneles de última generación, inversores/microinversores, estructura de montaje profesional, cableado especializado, protecciones eléctricas, instalación por técnicos certificados, trámites completos ante CFE, app de monitoreo en tiempo real, y todas las garantías respaldadas.'
    },
    {
      question: '¿Cuánto tiempo dura la instalación?',
      answer: 'Instalación física: 5 días laborales (1 semana). Trámites CFE: 2-4 semanas adicionales. Tiempo total: 4-6 semanas desde la visita técnica hasta que empiezas a generar energía.'
    },
    {
      question: '¿Qué garantías tengo?',
      answer: '✓ 2 años garantía total de instalación y mano de obra\n✓ 12 años garantía en equipos (inversores y accesorios)\n✓ 25 años garantía de generación de energía en paneles solares'
    },
    {
      question: '¿Puedo financiar la inversión?',
      answer: 'Sí, ofrecemos opciones de financiamiento con diferentes plazos y tasas preferenciales. Nuestro equipo puede ayudarte a encontrar la mejor opción según tu situación. También puedes aprovechar esquemas de deducción de impuestos disponibles.'
    },
    {
      question: '¿Qué mantenimiento requiere el sistema?',
      answer: 'Los sistemas solares requieren muy poco mantenimiento. Se recomienda limpiar los paneles 2-3 veces al año (o después de tormentas de polvo) y una revisión técnica anual. Los componentes están diseñados para operar sin problemas durante décadas.'
    }
  ];

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-100 transition-colors"
          >
            <span className="font-bold text-slate-900 pr-4">{faq.question}</span>
            {openIndex === index ? (
              <Minus className="w-5 h-5 flex-shrink-0" style={{ color: '#ff5c36' }} />
            ) : (
              <Plus className="w-5 h-5 flex-shrink-0" style={{ color: '#ff5c36' }} />
            )}
          </button>
          {openIndex === index && (
            <div className="px-5 pb-5 pt-0">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Proposal({ proposal, onClose, userName }: ProposalProps) {
  const firstName = getFirstName(userName);
  const [showFutureProposal, setShowFutureProposal] = useState(true);

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .calendly-inline-widget {
            display: none !important;
          }
          .print-cta {
            display: block !important;
          }
          @page {
            margin: 0.5cm;
            size: letter;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .bg-white.rounded-2xl {
            page-break-inside: auto;
            page-break-after: auto;
          }
          h2, h3, h4 {
            page-break-after: avoid;
          }
        }
        .print-cta {
          display: none;
        }
      `}</style>
      <div className="min-h-screen bg-slate-50 py-8 px-4 relative">
        <div className="fixed top-6 right-6 z-50 flex gap-3 no-print">
          <button
            onClick={handleDownloadPDF}
            className="w-12 h-12 bg-white rounded-full shadow-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-all"
            aria-label="Descargar PDF"
          >
            <Download className="w-6 h-6 text-slate-700" />
          </button>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-white rounded-full shadow-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-all"
            aria-label="Cerrar propuesta"
          >
            <X className="w-6 h-6 text-slate-700" />
          </button>
        </div>

      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <img
                src="/SolarYa logos_Primary Logo.png"
                alt="SolarYa"
                className="h-8 md:h-10 w-auto opacity-90"
              />
              <p className="text-slate-500 text-xs md:text-sm mt-1.5">Accesible. Confiable. Simple.</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">Esta es tu propuesta, {firstName}</p>
              <p className="text-sm text-slate-600">{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {proposal.future && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-blue-900 mb-3">
                  <strong>💡 Planificación inteligente:</strong> Hemos preparado dos propuestas para ti.
                  La segunda considera las cargas adicionales que planeas instalar, asegurando que tu sistema crezca con tus necesidades.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold text-blue-900 whitespace-nowrap">
                  Comparar con cargas futuras
                </span>
                <button
                  onClick={() => setShowFutureProposal(!showFutureProposal)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showFutureProposal ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={showFutureProposal}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showFutureProposal ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {proposal.future ? (
          <>
            <div className={`mb-8 ${showFutureProposal ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}`}>
              <ProposalCard data={proposal.current} title="Propuesta para Consumo Actual" onClose={onClose} showSharedSections={false} />
              {showFutureProposal && (
                <ProposalCard data={proposal.future} title="Propuesta con Cargas Futuras" onClose={onClose} showSharedSections={false} />
              )}
            </div>
            <SharedSections onClose={onClose} />
          </>
        ) : (
          <div className="mb-8">
            <ProposalCard data={proposal.current} title="Tu Propuesta Personalizada de Sistema de Paneles Solares" onClose={onClose} />
          </div>
        )}

        {!proposal.future && (
          <>
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
              <h4 className="text-xl font-bold text-slate-900 mb-4">Usamos Sólo las Mejores Marcas</h4>
              <p className="text-sm text-slate-600 mb-6">Líderes mundiales en tecnología solar</p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border-2 rounded-xl p-5" style={{ borderColor: '#ff9b7a' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ background: '#ff5c36' }}>
                      T1
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">Paneles Tier 1</h5>
                      <p className="text-xs text-slate-600">Paneles Solares</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>• Marca reconocida mundialmente</p>
                    <p>• Máxima calidad y confiabilidad</p>
                    <p>• Tecnología bifacial N-Type</p>
                  </div>
                </div>

                <div className="bg-white border-2 rounded-xl p-5" style={{ borderColor: '#ff9b7a' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ background: '#1e3a2b' }}>
                      H
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">Hoymiles</h5>
                      <p className="text-xs text-slate-600">Microinversores</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>• Líder global en microinversores</p>
                    <p>• +5M unidades instaladas</p>
                    <p>• Eficiencia hasta 97.3%</p>
                  </div>
                </div>

                <div className="bg-white border-2 rounded-xl p-5" style={{ borderColor: '#ff9b7a' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ background: '#ff5c36' }}>
                      H
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">Huawei</h5>
                      <p className="text-xs text-slate-600">Inversores String</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>• Líder mundial en inversores</p>
                    <p>• Tecnología FusionSolar</p>
                    <p>• Eficiencia hasta 98.6%</p>
                  </div>
                </div>

                <div className="bg-white border-2 rounded-xl p-5" style={{ borderColor: '#ff9b7a' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ background: '#1e3a2b' }}>
                      A
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">Aluminext</h5>
                      <p className="text-xs text-slate-600">Sistema de Montaje</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>• Fabricante mexicano premium</p>
                    <p>• Aluminio grado industrial</p>
                    <p>• Diseño antisísmico certificado</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <a
                  href="https://calendly.com/narciso-solarya/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 shadow-lg"
                  style={{ background: '#ff5c36', color: 'white' }}
                >
                  Agendar visita técnica gratuita
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
              <h4 className="text-xl font-bold text-slate-900 mb-6">Proceso y Tiempos</h4>

              <div className="relative">
                <div className="absolute left-6 top-12 bottom-12 w-0.5" style={{ background: '#ff5c36' }}></div>

                <div className="space-y-8">
                  <div className="flex gap-4 relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                      1
                    </div>
                    <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-slate-900">Visita Técnica</h5>
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~1 día
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">Evaluación gratuita y propuesta final</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                      2
                    </div>
                    <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-slate-900">Contrato y Anticipo</h5>
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~1 día
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">Firma y pago del 50%</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                      3
                    </div>
                    <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-slate-900">Instalación</h5>
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~5 días
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">Sistema funcionando</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10" style={{ background: '#ff5c36' }}>
                      4
                    </div>
                    <div className="flex-1 bg-white border-2 rounded-xl p-4" style={{ borderColor: '#ff9b7a' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-slate-900">Interconexión CFE</h5>
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          2-4 semanas
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">Trámites y medidor bidireccional</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-slate-50 border-2 rounded-xl p-4 text-center" style={{ borderColor: '#ff9b7a' }}>
                <p className="text-sm font-semibold" style={{ color: '#1e3a2b' }}>
                  ⏱️ Tiempo total estimado: 4-6 semanas desde la visita hasta interconexión completa
                </p>
              </div>

              <div className="mt-6 text-center">
                <a
                  href=""
                  onClick={openCalendlyPopup}
                  className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 shadow-lg cursor-pointer"
                  style={{ background: '#ff5c36', color: 'white' }}
                >
                  Agendar visita técnica gratuita
                </a>
                <p className="text-xs text-slate-500 mt-2">Agenda tu cita ahora · Sin compromiso</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
              <h3 className="text-2xl font-bold mb-6" style={{ color: '#1e3a2b' }}>Preguntas Frecuentes</h3>
              <FAQAccordion />

              <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                <p className="text-slate-700 mb-4">¿Tienes más preguntas? Hablemos</p>
                <a
                  href=""
                  onClick={openCalendlyPopup}
                  className="inline-block px-8 py-3 rounded-xl font-bold transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: '#ff5c36', color: 'white' }}
                >
                  Agendar visita técnica gratuita
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border-2 p-8 md:p-12 text-center" style={{ borderColor: '#ff9b7a' }}>
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1e3a2b' }}>
            Da el Primer Paso Hacia Tu Independencia Energética
          </h3>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Agenda tu visita técnica <strong>100% gratuita</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
          </p>
          <a
            href=""
            onClick={openCalendlyPopup}
            className="inline-block px-12 py-5 rounded-xl font-bold text-xl transition-all hover:opacity-90 shadow-2xl mb-4 cursor-pointer"
            style={{ background: '#ff5c36', color: 'white' }}
          >
            Agendar Visita Técnica Gratuita
          </a>
          <p className="text-sm text-slate-500">Respuesta en menos de 24 horas · Sin letra pequeña</p>

          <div className="mt-8 flex items-center justify-center gap-8 flex-wrap text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
              <span>Sin compromiso</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
              <span>100% gratis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#3cd070' }} />
              <span>Respuesta rápida</span>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
      </div>
    </>
  );
}
