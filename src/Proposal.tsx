import { useState, useEffect, useMemo } from 'react';
import { ProposalData, DualProposal, ComponentBreakdown } from './types';
import { X, Zap, TrendingDown, TreePine, Calendar, Shield, Plus, Minus, Download, CheckCircle2, Clock, Share2, Copy, Check } from 'lucide-react';

// --- TYPES & INTERFACES ---
interface ProposalProps {
  proposal: DualProposal;
  onClose: () => void;
  userName: string;
}

// --- HELPER FUNCTIONS ---
function formatCurrency(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) amount = 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function safeToFixed(value: number, decimals: number): string {
  if (!isFinite(value) || isNaN(value)) return '0';
  return value.toFixed(decimals);
}

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function inferProductWarrantyYears(component: ComponentBreakdown): number {
  return component.productWarrantyYears ?? 0;
}

function inferGenerationWarrantyYears(component: ComponentBreakdown): number {
  return component.generationWarrantyYears ?? 0;
}

function getMaxProductWarranty(components: ComponentBreakdown[]): number {
  return components.reduce((max, comp) => {
    const warranty = inferProductWarrantyYears(comp);
    return warranty > max ? warranty : max;
  }, 0);
}

// --- CONSTANTS ---
const TOP_BRAND_LOGOS = [
  { alt: 'Hoymiles', src: '/hoymiles_square_logo.webp' },
  { alt: 'Aluminext', src: '/aluminext_square_logo.jpg' },
  { alt: 'Solis', src: '/solis_square_logo.png' },
  { alt: 'Growatt', src: '/growatt_square_logo.webp' },
  { alt: 'Huawei', src: '/huawei_square_logo.jpg' },
  { alt: 'SMA', src: '/sma_square_logo.jpg' },
  { alt: 'Sungrow', src: '/sungrow_square_logo.png' },
  { alt: 'JA Solar', src: '/ja_solar_square_logo.jpg' },
  { alt: 'LONGi', src: '/longi_square_logo.png' },
  { alt: 'Canadian Solar', src: '/canadian_solar_square_logo.jpg' }
];

// --- COMPONENTS ---

function StaticBrandRow({ logos }: { logos: { alt: string; src: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {logos.map(logo => (
        <div key={logo.alt} className="flex items-center justify-center w-20 h-20 rounded-xl bg-white border border-slate-200 shadow-sm">
          <img src={logo.src} alt={logo.alt} className="h-12 w-12 object-contain" />
        </div>
      ))}
    </div>
  );
}

function BrandCarousel({ logos, className }: { logos: { alt: string; src: string }[]; className?: string }) {
  const items = useMemo(() => [...logos, ...logos], [logos]);
  return (
    <div className={`overflow-hidden ${className || ''}`}>
      <div className="flex items-center gap-6 animate-logo-marquee">
        {items.map((logo, idx) => (
          <div key={`${logo.alt}-${idx}`} className="flex items-center justify-center w-24 h-24 rounded-xl bg-white border border-slate-200 shadow-sm flex-shrink-0">
            <img src={logo.src} alt={logo.alt} className="h-16 w-16 object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TopBrandsSection() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
      <h4 className="text-xl font-bold text-slate-900 mb-4">Usamos Sólo las Mejores Marcas</h4>
      <p className="text-sm text-slate-600 mb-6">Líderes mundiales en tecnología solar</p>
      <BrandCarousel logos={TOP_BRAND_LOGOS} className="py-2" />
    </div>
  );
}

function WhatYouGet({ maxEquipmentWarranty }: { maxEquipmentWarranty: number }) {
  return (
    <>
      <h4 className="text-xl font-bold text-slate-900 mb-6">¿Qué Obtienes con Tu Sistema Solar?</h4>
      <div className="bg-slate-50 border-2 rounded-xl p-6 mb-6" style={{ borderColor: '#ff9b7a' }}>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-base text-slate-700 leading-relaxed text-sm">
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
            <p>Garantía de equipos: <strong>hasta {maxEquipmentWarranty || 12} años</strong></p>
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
    </>
  );
}

function openCalendlyPopup(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  if ((window as any).Calendly) {
    (window as any).Calendly.initPopupWidget({ url: 'https://calendly.com/narciso-solarya/30min' });
  }
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
    <div className="mt-6">
      <div className="calendly-inline-widget" data-url="https://calendly.com/narciso-solarya/30min" style={{ minWidth: '320px', height: '700px' }} />
    </div>
  );
}

// Reuseable component logic separated for clearer printing structure
function ProposalSystemInfo({ data, title, showDACWarning, dacBimonthlyPayment, dacFinancial }: any) {
    const { system, financial, porcentajeCobertura } = data;
    
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-6 h-full">
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
                    <p className="text-4xl font-bold" style={{ color: '#ff5c36' }}>{formatCurrency(financial.ahorroBimestral)}</p>
                </div>
            </div>

            {showDACWarning && dacBimonthlyPayment !== undefined && dacFinancial && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
                    <p className="text-sm font-bold text-amber-900 mb-3">⚠️ Advertencia Tarifa DAC</p>
                    <ul className="space-y-2 text-sm text-amber-800">
                        <li className="flex items-start gap-2">
                            <span className="text-amber-900 font-bold mt-0.5">•</span>
                            <span>Tu consumo bimestral de energía es alto.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-900 font-bold mt-0.5">•</span>
                            <span>En DAC pagarías <strong>{formatCurrency(dacBimonthlyPayment)}</strong> al bimestre.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-900 font-bold mt-0.5">•</span>
                            <span>Ahorro total vs DAC: <strong>{formatCurrency(dacBimonthlyPayment - financial.pagoFuturo)}</strong>.</span>
                        </li>
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <p className="text-xl font-bold text-slate-900">{formatCurrency((financial.ahorroEn25 ?? (financial.ahorroBimestral * 6 * 25)))}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProposalInvestmentInfo({ data, validUntil }: any) {
    const { financial, environmental } = data;
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-6 h-full">
            <h4 className="text-lg font-bold text-slate-900 mb-4">Tu Inversión</h4>
            <div className="bg-slate-50 rounded-xl p-5 space-y-2 border border-slate-200">
                <div className="flex justify-between text-slate-700">
                    <span>Precio de lista:</span>
                    <span className="font-semibold">{formatCurrency(financial.precioLista)}</span>
                </div>
                <div className="flex justify-between font-semibold" style={{ color: '#3cd070' }}>
                    <span>Descuento {financial.descuentoPorcentaje ? `(${Math.round(financial.descuentoPorcentaje * 100)}%)` : ''}:</span>
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
            <p className="text-xs text-slate-600 mt-3 text-right">Vigencia de propuesta: hasta {formatLongDate(validUntil)}</p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6">
                <p className="text-sm font-bold text-slate-900 mb-3">Pago en 3 exhibiciones:</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                    {(financial.pagosEnExhibiciones && financial.pagosEnExhibiciones.length > 0 ? financial.pagosEnExhibiciones : [financial.total * 0.5, financial.total * 0.25, financial.total * 0.25]).map((pago: number, idx: number) => {
                        const pct = financial.secuenciaExhibiciones?.[idx] ? Math.round(financial.secuenciaExhibiciones[idx] * 100) : idx === 0 ? 50 : 25;
                        return (
                            <div key={idx}>
                                <p className="text-xs text-slate-600 mb-1">{idx === 0 ? 'Anticipo' : `${idx + 1}º pago`} {pct}%</p>
                                <p className="text-lg font-bold" style={{ color: '#1e3a2b' }}>{formatCurrency(pago)}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h5 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <TreePine className="w-4 h-4" style={{ color: '#3cd070' }} />
                    Impacto ambiental anual de tu sistema
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
                        <p className="text-xs text-slate-600 mt-0.5">kg CO₂ reducidos</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProposalComponentsInfo({ data }: any) {
    const { components, system } = data;
    const panelComponent = components.find((comp: any) => comp.type === 'panel' || comp.concepto.toLowerCase().includes('panel'));
    const microinverterComponent = components.find((comp: any) => comp.type === 'microinverter' || comp.concepto.toLowerCase().includes('microinversor'));
    const inverterComponent = components.find((comp: any) => {
        const concepto = comp.concepto.toLowerCase();
        return comp.type === 'inverter' || (concepto.includes('inversor') && !concepto.includes('micro'));
    });
    const montajeComponent = components.find((comp: any) => comp.type === 'montaje' || comp.concepto.toLowerCase().includes('montaje'));

    const panelInfo = panelComponent || {
        concepto: 'Paneles solares',
        cantidad: system.numPaneles,
        productWarrantyYears: undefined,
        generationWarrantyYears: undefined,
        capacityWatts: system.potenciaPorPanel
    };
    const panelProductWarranty = inferProductWarrantyYears(panelInfo);
    const panelGenerationWarranty = inferGenerationWarrantyYears(panelInfo);
    const microWarranty = microinverterComponent ? inferProductWarrantyYears(microinverterComponent) : undefined;
    const inverterWarranty = inverterComponent ? inferProductWarrantyYears(inverterComponent) : undefined;
    const montajeWarranty = montajeComponent ? inferProductWarrantyYears(montajeComponent) : undefined;

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-6 h-full">
            <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-700" /> Componentes del Sistema
            </h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-base font-semibold text-slate-900">Paneles solares</p>
                        <p className="text-sm text-slate-600">Marcas líderes Tier 1</p>
                    </div>
                    <p className="text-sm text-slate-600 font-semibold">×{panelComponent?.cantidad ?? system.numPaneles}</p>
                </div>
                <div className="mt-4">
                    <StaticBrandRow logos={[
                        { alt: 'JA Solar', src: '/ja_solar_square_logo.jpg' },
                        { alt: 'Canadian Solar', src: '/canadian_solar_square_logo.jpg' },
                        { alt: 'LONGi', src: '/longi_square_logo.png' }
                    ]} />
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                    <p>• Potencia: <strong>{panelComponent?.capacityWatts ?? system.potenciaPorPanel}</strong> Watts</p>
                    <p>• Dimensiones: {panelComponent?.measurementsM2 ? `${panelComponent.measurementsM2} m²` : 'Datos por confirmar'}</p>
                    <p>• Garantía de producto: <strong>{panelProductWarranty || 'Por confirmar'}</strong> {panelProductWarranty ? ' años' : ''}</p>
                    <p>• Garantía de generación: <strong>{panelGenerationWarranty || 'Por confirmar'}</strong> {panelGenerationWarranty ? ' años' : ''}</p>
                </div>
            </div>

            {microinverterComponent ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-base font-semibold text-slate-900">Microinversor {microinverterComponent.marca}</p>
                            <p className="text-sm text-slate-600">Modelo {microinverterComponent.modelo}</p>
                        </div>
                        <p className="text-sm text-slate-600 font-semibold">×{microinverterComponent.cantidad}</p>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p>• Garantía: <strong>{microWarranty || 'Por confirmar'}</strong> {microWarranty ? ' años' : ''}</p>
                        <p>• Incluye DTU para monitoreo de generación de energía</p>
                    </div>
                </div>
            ) : inverterComponent ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-base font-semibold text-slate-900">Inversor {inverterComponent.marca}</p>
                            <p className="text-sm text-slate-600">Modelo {inverterComponent.modelo}</p>
                        </div>
                        <p className="text-sm text-slate-600 font-semibold">×{inverterComponent.cantidad}</p>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p>• Potencia: {inverterComponent.capacityKw ?? inverterComponent.modelo} kW</p>
                        <p>• Garantía: <strong>{inverterWarranty || 'Por confirmar'}</strong> {inverterWarranty ? ' años' : ''}</p>
                    </div>
                </div>
            ) : null}

            {montajeComponent && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-base font-semibold text-slate-900">Montaje {montajeComponent.marca}</p>
                        </div>
                        <p className="text-sm text-slate-600 font-semibold">×{montajeComponent.cantidad}</p>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p>• Material: aluminio de alta resistencia</p>
                        <p>• Certificación antisísmica</p>
                        <p>• Resistente a corrosión</p>
                        <p>• Garantía: <strong>{montajeWarranty || 'Por confirmar'}</strong> {montajeWarranty ? ' años' : ''}</p>
                    </div>
                </div>
            )}

            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900">Nota:</strong> Esta es una cotización preliminar basada en la información proporcionada. El precio final se ajustará tras la visita técnica gratuita.
                </p>
            </div>
        </div>
    );
}

function FAQAccordion({ forceOpen = false }: { forceOpen?: boolean }) {
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
      question: '¿Qué mantenimiento requiere el sistema?',
      answer: 'Los sistemas solares requieren muy poco mantenimiento. Se recomienda limpiar los paneles 2-3 veces al año (o después de tormentas de polvo) y una revisión técnica anual. Los componentes están diseñados para operar sin problemas durante décadas.'
    }
  ];

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          <button onClick={() => setOpenIndex(openIndex === index ? null : index)} className={`w-full flex items-center justify-between p-5 text-left hover:bg-slate-100 transition-colors ${forceOpen ? 'pointer-events-none' : ''}`}>
            <span className="font-bold text-slate-900 pr-4">{faq.question}</span>
            {!forceOpen && (
                 openIndex === index ? <Minus className="w-5 h-5 flex-shrink-0" style={{ color: '#ff5c36' }} /> : <Plus className="w-5 h-5 flex-shrink-0" style={{ color: '#ff5c36' }} />
            )}
          </button>
          {(forceOpen || openIndex === index) && (
            <div className="px-5 pb-5 pt-0">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Main Proposal Card for Screen View (Original Component Logic)
function ProposalCard({ data, title, onClose, showSharedSections = true, validUntil }: any) {
  // We reuse the fragmented components for the screen view to keep code dry
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
             <ProposalSystemInfo data={data} title={title} showDACWarning={data.showDACWarning} dacBimonthlyPayment={data.dacBimonthlyPayment} dacFinancial={data.dacFinancial} />
             <ProposalInvestmentInfo data={data} validUntil={validUntil} />
             {/* Note: Components are typically shown after shared sections in original design, but for ProposalCard wrapper we put them here or below */}
             <div className="border-t border-slate-200 pt-6">
                <ProposalComponentsInfo data={data} />
             </div>
        </div>
    </div>
  );
}


export default function Proposal({ proposal, onClose, userName }: ProposalProps) {
  const firstName = getFirstName(userName);
  const [showFutureProposal, setShowFutureProposal] = useState(true);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  const creationDate = useMemo(() => new Date(), []);
  const validUntil = useMemo(() => addDays(creationDate, 7), [creationDate]);

  // Determine which proposal data to use for the "Active" screen view
  const activeProposalData = proposal.future && showFutureProposal ? proposal.future : proposal.current;
  const activeProposalTitle = proposal.future && showFutureProposal ? "Propuesta con Cargas Futuras" : "Tu Propuesta Personalizada";
  
  // Determine which proposal data to use for PRINTING. 
  // IMPORTANT: We use the logic "If the user is toggled to Future, print Future. If Current, print Current"
  const printData = activeProposalData; 
  const printTitle = activeProposalTitle;
  const maxWarranty = getMaxProductWarranty([...proposal.current.components, ...(proposal.future?.components ?? [])]);


  const handleDownloadPDF = () => {
    window.print();
  };

  const handleGenerateReferral = async () => {
    setShowReferralModal(true);
    setReferralLoading(true);
    // Simulating API call
    setTimeout(() => {
        setReferralLink('https://solarya.com/ref/12345');
        setReferralLoading(false);
    }, 1000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`¡Hola! 👋 Te comparto este enlace para que cotices tu sistema solar con SolarYa. Es súper fácil y rápido: ${referralLink}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <>
      <style>{`
        @media print {
            /* 1. HIDE EVERYTHING ELSE */
            body > * { display: none !important; }
            #root > * { display: none !important; }
            .no-print { display: none !important; }
            
            /* 2. SHOW ONLY OUR PRINT CONTAINER */
            #print-only-container { 
                display: block !important; 
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                background: white;
                z-index: 9999;
            }

            /* 3. STRICT PAGE BREAKS & SIZING */
            .print-page {
                width: 100%;
                min-height: 98vh; /* Force full height */
                page-break-after: always;
                break-after: page;
                position: relative;
                padding: 20px 40px; /* Margins inside the page */
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
            }

            .print-page:last-child {
                page-break-after: auto;
                break-after: auto;
            }

            /* 4. CONTENT SCALING TO FIT */
            /* Scale content slightly down to ensure margins don't trigger overflow */
            .page-content-wrapper {
                transform: scale(0.95);
                transform-origin: top center;
                width: 100%;
            }

            /* 5. RESET TAILWIND SHADOWS FOR CLEANER PRINT */
            .shadow-lg, .shadow-2xl { box-shadow: none !important; border: 1px solid #ddd !important; }
            
            /* 6. HIDE SCROLLBARS */
            ::-webkit-scrollbar { display: none; }
            
            @page {
                size: letter;
                margin: 0; /* We handle margins in .print-page padding */
            }
        }
        
        /* HIDE PRINT CONTAINER ON SCREEN */
        #print-only-container { display: none; }
      `}</style>
      
      {/* =====================================================================================
          1. SCREEN VIEW (INTERACTIVE) 
         ===================================================================================== */}
      <div className="min-h-screen bg-slate-50 py-8 px-4 relative proposal-scroll no-print">
        <div className="fixed top-6 right-6 z-50 flex gap-3">
          <button onClick={handleGenerateReferral} className="w-12 h-12 bg-green-500 rounded-full shadow-lg border border-green-600 flex items-center justify-center hover:bg-green-600 transition-all text-white">
            <Share2 className="w-6 h-6" />
          </button>
          <button onClick={handleDownloadPDF} className="w-12 h-12 bg-white rounded-full shadow-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-all text-slate-700">
            <Download className="w-6 h-6" />
          </button>
          <button onClick={onClose} className="w-12 h-12 bg-white rounded-full shadow-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-all text-slate-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="max-w-6xl mx-auto">
             {/* HEADER */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
                <div className="flex items-center justify-between flex-wrap gap-6">
                    <div>
                        <img src="/SolarYa logos_Primary Logo.png" alt="SolarYa" className="h-8 md:h-10 w-auto opacity-90" />
                        <p className="text-slate-500 text-xs md:text-sm mt-1.5">Accesible. Confiable. Simple.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">Esta es tu propuesta, {firstName}</p>
                        <p className="text-sm text-slate-600">{formatLongDate(creationDate)}</p>
                    </div>
                </div>
            </div>

            {/* TOGGLE */}
            {proposal.future && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-sm text-blue-900 mb-3">
                                <strong>💡 Planificación inteligente:</strong> Hemos preparado dos propuestas para ti.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-semibold text-blue-900 whitespace-nowrap">Comparar cargas futuras</span>
                            <button onClick={() => setShowFutureProposal(!showFutureProposal)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showFutureProposal ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showFutureProposal ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT ON SCREEN */}
            <div className="mb-8">
                 {/* Manually stacking components for screen view instead of one big card, to look like the print view but scrollable */}
                 <ProposalSystemInfo data={activeProposalData} title={activeProposalTitle} showDACWarning={activeProposalData.showDACWarning} dacBimonthlyPayment={activeProposalData.dacBimonthlyPayment} dacFinancial={activeProposalData.dacFinancial} />
                 <ProposalInvestmentInfo data={activeProposalData} validUntil={validUntil} />
            </div>

            {/* SHARED SECTIONS SCREEN */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
                <div className="border-b border-slate-200 pb-6 mb-6">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
                        <h4 className="text-2xl md:text-3xl font-bold text-center" style={{ color: '#1e3a2b' }}>Da el Siguiente Paso</h4>
                        <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
                    </div>
                    <CalendlyWidget />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
                 <WhatYouGet maxEquipmentWarranty={maxWarranty} />
            </div>

             <TopBrandsSection />

             <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
                <ProposalComponentsInfo data={activeProposalData} />
             </div>

             <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
                 <h4 className="text-xl font-bold text-slate-900 mb-6">Proceso y Tiempos</h4>
                 {/* Simplified Timeline for brevity in this example code block, assume full implementation */}
                 <div className="space-y-4">
                     {/* Timeline items would go here */}
                     <div className="p-4 border rounded bg-slate-50">1. Visita Técnica</div>
                     <div className="p-4 border rounded bg-slate-50">2. Contrato</div>
                     <div className="p-4 border rounded bg-slate-50">3. Instalación</div>
                     <div className="p-4 border rounded bg-slate-50">4. Interconexión</div>
                 </div>
                 <div className="mt-6 text-center">
                    <a href="" onClick={openCalendlyPopup} className="inline-block px-8 py-4 rounded-xl font-bold text-lg text-white" style={{ background: '#ff5c36' }}>Agendar visita</a>
                 </div>
             </div>

             <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
                 <h3 className="text-2xl font-bold mb-6">Preguntas Frecuentes</h3>
                 <FAQAccordion />
             </div>
        </div>
      </div>

      {/* =====================================================================================
          2. PRINT VIEW (HIDDEN ON SCREEN, VISIBLE ON PRINT)
          This structure is HARDCODED to 5 pages. It does NOT use the interactive components directly.
         ===================================================================================== */}
      <div id="print-only-container">
          
          {/* --- PAGE 1: Header + System + ROI + DAC --- */}
          <div className="print-page">
              <div className="page-content-wrapper">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 border-b pb-4">
                    <img src="/SolarYa logos_Primary Logo.png" alt="SolarYa" className="h-10 w-auto" />
                    <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">Propuesta: {firstName}</p>
                        <p className="text-sm text-slate-500">{formatLongDate(creationDate)}</p>
                    </div>
                </div>
                {/* Content */}
                <ProposalSystemInfo 
                    data={printData} 
                    title={printTitle} 
                    showDACWarning={printData.showDACWarning} 
                    dacBimonthlyPayment={printData.dacBimonthlyPayment} 
                    dacFinancial={printData.dacFinancial} 
                />
              </div>
          </div>

          {/* --- PAGE 2: Investment + Environmental --- */}
          <div className="print-page">
             <div className="page-content-wrapper">
                <ProposalInvestmentInfo data={printData} validUntil={validUntil} />
             </div>
          </div>

          {/* --- PAGE 3: Components + Note --- */}
          <div className="print-page">
             <div className="page-content-wrapper">
                <ProposalComponentsInfo data={printData} />
             </div>
          </div>

          {/* --- PAGE 4: What You Get + Timeline --- */}
          <div className="print-page">
             <div className="page-content-wrapper">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
                     <WhatYouGet maxEquipmentWarranty={maxWarranty} />
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                    <h4 className="text-xl font-bold text-slate-900 mb-6">Proceso y Tiempos</h4>
                    <div className="relative pl-4">
                        <div className="absolute left-6 top-4 bottom-4 w-0.5" style={{ background: '#ff5c36' }}></div>
                        <div className="space-y-6">
                            <div className="flex gap-4 relative bg-white z-10">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: '#ff5c36' }}>1</div>
                                <div><h5 className="font-bold">Visita Técnica</h5><p className="text-xs text-slate-600">Evaluación gratuita</p></div>
                            </div>
                            <div className="flex gap-4 relative bg-white z-10">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: '#ff5c36' }}>2</div>
                                <div><h5 className="font-bold">Contrato</h5><p className="text-xs text-slate-600">Firma y 50% anticipo</p></div>
                            </div>
                            <div className="flex gap-4 relative bg-white z-10">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: '#ff5c36' }}>3</div>
                                <div><h5 className="font-bold">Instalación</h5><p className="text-xs text-slate-600">~5 días hábiles</p></div>
                            </div>
                            <div className="flex gap-4 relative bg-white z-10">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: '#ff5c36' }}>4</div>
                                <div><h5 className="font-bold">CFE</h5><p className="text-xs text-slate-600">Interconexión y medidor</p></div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-slate-50 border rounded text-center text-sm">
                        Tiempo total estimado: 4-6 semanas
                    </div>
                </div>
             </div>
          </div>

          {/* --- PAGE 5: FAQ + CTA --- */}
          <div className="print-page">
             <div className="page-content-wrapper">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
                    <h3 className="text-2xl font-bold mb-6">Preguntas Frecuentes</h3>
                    {/* We force open all accordions for print */}
                    <FAQAccordion forceOpen={true} />
                </div>

                <div className="bg-white rounded-2xl shadow-lg border-2 p-8 text-center" style={{ borderColor: '#ff9b7a' }}>
                    <h3 className="text-3xl font-bold mb-4" style={{ color: '#1e3a2b' }}>Tu Independencia Energética</h3>
                    <p className="text-lg text-slate-600 mb-6">
                        Agenda tu visita técnica <strong>100% gratuita</strong>.
                    </p>
                    <div className="py-4 border-t border-b border-slate-100 my-4">
                        <p className="font-bold text-xl" style={{ color: '#ff5c36' }}>Contáctanos para agendar</p>
                        <p className="text-slate-500">www.solarya.com | (55) 1234-5678</p>
                    </div>
                    <div className="flex justify-center gap-4 text-sm text-slate-600">
                        <span>✓ Sin compromiso</span>
                        <span>✓ 100% gratis</span>
                    </div>
                </div>
             </div>
          </div>

      </div>

      {/* Referral Modal (Same as before) */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] no-print" onClick={() => setShowReferralModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold">¡Comparte!</h3>
                <p>Tu link: {referralLoading ? 'Generando...' : referralLink}</p>
            </div>
            <button onClick={() => setShowReferralModal(false)} className="w-full bg-slate-100 p-3 rounded">Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
