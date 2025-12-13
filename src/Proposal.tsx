import { useState, useEffect, useMemo } from 'react';
import { ProposalData, DualProposal, EnvironmentalImpact } from './types';
import { X, Zap, TrendingDown, TreePine, Calendar, Shield, Plus, Minus, Download, CheckCircle2, Clock, Share2, Copy, Check, Loader2 } from 'lucide-react';

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

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function inferProductWarrantyYears(component: ComponentBreakdown): number {
  if (component.productWarrantyYears != null) return component.productWarrantyYears;
  return 0;
}

function inferGenerationWarrantyYears(component: ComponentBreakdown): number {
  if (component.generationWarrantyYears != null) return component.generationWarrantyYears;
  return 0;
}

function getMaxProductWarranty(components: ComponentBreakdown[]): number {
  return components.reduce((max, comp) => {
    const warranty = inferProductWarrantyYears(comp);
    return warranty > max ? warranty : max;
  }, 0);
}

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


function StaticBrandRow({ logos }: { logos: { alt: string; src: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {logos.map(logo => (
        <div
          key={logo.alt}
          className="flex items-center justify-center w-24 h-24 rounded-xl bg-white border border-slate-200 shadow-sm"
        >
          <img src={logo.src} alt={logo.alt} className="h-16 w-16 object-contain" />
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
          <div
            key={`${logo.alt}-${idx}`}
            className="flex items-center justify-center w-24 h-24 rounded-xl bg-white border border-slate-200 shadow-sm flex-shrink-0"
          >
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
    <div className="pdf-whatyouget">
      <h4 className="text-xl font-bold text-slate-900 mb-6">¿Qué Obtienes con Tu Sistema Solar?</h4>

      <div className="bg-slate-50 border-2 rounded-xl p-6 mb-6 pdf-whatyouget-shell" style={{ borderColor: '#ff9b7a' }}>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-base text-slate-700 leading-relaxed pdf-whatyouget-grid">
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
            <p>Garantía de generación de energía: <strong>2 años</strong></p>
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
    </div>
  );
}

function openCalendlyPopup(e: React.MouseEvent<HTMLAnchorElement>) {
  if (window.Calendly) {
    e.preventDefault();
    window.Calendly.initPopupWidget({ url: CALENDLY_URL });
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
    <>
      <div className="mt-6">
        <div
          className="calendly-inline-widget"
          data-url={CALENDLY_URL}
          style={{ minWidth: '320px', height: '700px' }}
        />
      </div>
      <div className="print-cta mt-6 text-center">
        <a
          href={CALENDLY_URL}
          className="inline-block px-12 py-5 rounded-xl font-bold text-xl shadow-2xl mb-4"
          target="_blank"
          rel="noreferrer noopener"
          style={{ background: '#ff5c36', color: 'white' }}
        >
          Agendar Visita Técnica Gratuita
        </a>
        <p className="text-sm text-slate-500">Visita: calendly.com/narciso-solarya/30min</p>
      </div>
    </>
  );
}

function ProposalCard({
  data,
  title,
  onClose,
  showSharedSections = true,
  validUntil,
  variantKey = 'actual',
  forcePdfOpen = false
}: {
  data: ProposalData;
  title: string;
  onClose: () => void;
  showSharedSections?: boolean;
  validUntil: Date;
  variantKey?: 'actual' | 'futura';
  forcePdfOpen?: boolean;
}) {
  const { system, financial, environmental, components, porcentajeCobertura, showDACWarning, dacBimonthlyPayment, dacFinancial } = data;
  const maxEquipmentWarranty = getMaxProductWarranty(components);

  const panelComponent = components.find(
    comp => comp.type === 'panel' || comp.concepto.toLowerCase().includes('panel')
  );
  const microinverterComponent = components.find(
    comp => comp.type === 'microinverter' || comp.concepto.toLowerCase().includes('microinversor')
  );
  const inverterComponent = components.find(comp => {
    const concepto = comp.concepto.toLowerCase();
    return comp.type === 'inverter' || (concepto.includes('inversor') && !concepto.includes('micro'));
  });
  const montajeComponent = components.find(
    comp => comp.type === 'montaje' || comp.concepto.toLowerCase().includes('montaje')
  );
  const panelInfo: ComponentBreakdown = panelComponent || {
    concepto: 'Paneles solares',
    cantidad: system.numPaneles,
    marca: '',
    modelo: '',
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
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden print-compact-card">
      <div
        className="p-6 md:p-8 print-compact-section pdf-section"
        data-pdf-section="overview"
        data-pdf-variant={variantKey}
      >
        <h3 className="text-2xl font-bold mb-6 print-compact-heading" style={{ color: '#1e3a2b' }}>{title}</h3>

        <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200 print-compact-card">
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

        {showDACWarning && dacBimonthlyPayment !== undefined && dacFinancial && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 print-compact-card">
            <p className="text-sm font-bold text-amber-900 mb-3">⚠️ Advertencia Tarifa DAC</p>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Tu consumo bimestral de energía es alto y de seguir así los siguientes meses, la CFE podría pasarte a tarifa DAC (tarifa residencial de alto consumo).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Si caes (o ya estás) en tarifa DAC, pagarías <strong>{formatCurrency(dacBimonthlyPayment)}</strong> al bimestre.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Con SolarYa pagarías <strong>{formatCurrency(financial.pagoFuturo)}</strong> al bimestre.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Tu ahorro bimestral en DAC sería de <strong>{formatCurrency(dacBimonthlyPayment - financial.pagoFuturo)}</strong>.</span>
              </li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print-compact-grid">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#ff5c36' }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Tu Sistema Solar</h5>
            </div>
            <p className="text-3xl font-bold mb-2" style={{ color: '#1e3a2b' }}>{safeToFixed(system.potenciaTotal / 1000, 1)} kilowatts</p>
            <div className="space-y-1 text-sm text-slate-600 print-compact-text">
              <p><strong className="text-slate-900">{system.numPaneles}</strong> paneles solares de <strong className="text-slate-900">{system.potenciaPorPanel}</strong> watts c/u</p>
              <p>Energía generada: <strong className="text-slate-900">{Math.round(system.generacionMensualKwh * 2)}</strong> kWh/bimestre</p>
              <p>Generas el <strong className="text-slate-900">{safeToFixed(porcentajeCobertura, 0)}%</strong> de tu consumo</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#1e3a2b' }}>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Retorno de Inversión</h5>
            </div>
            <p className="text-3xl font-bold mb-2" style={{ color: '#1e3a2b' }}>{safeToFixed(financial.anosRetorno, 1)} años</p>
            <div className="space-y-1 text-sm text-slate-600 print-compact-text">
              <p>Ahorro en 25 años:</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency((financial.ahorroEn25 ?? (financial.ahorroBimestral * 6 * 25)))}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="p-6 md:p-8 pt-0 print-compact-section pdf-section"
        data-pdf-section="investment"
        data-pdf-variant={variantKey}
      >
        <div className="border-t border-slate-200 pt-6 mb-6 print-break-before print-break-after print-avoid-break print-compact-section">
          <h4 className="text-lg font-bold text-slate-900 mb-4">Tu Inversión</h4>
          <div className="bg-slate-50 rounded-xl p-5 space-y-2 border border-slate-200 print-compact-card">
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

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 print-compact-card">
            <p className="text-sm font-bold text-slate-900 mb-3">Pago en 3 exhibiciones:</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(financial.pagosEnExhibiciones && financial.pagosEnExhibiciones.length > 0 ? financial.pagosEnExhibiciones : [financial.total * 0.5, financial.total * 0.25, financial.total * 0.25]).map((pago, idx) => {
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

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
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
                <p className="text-xs text-slate-600 mt-0.5">kilogramos de CO₂ reducidos</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <div
        className="p-6 md:p-8 pt-0 print-compact-section pdf-section"
        data-pdf-section="components"
        data-pdf-variant={variantKey}
      >

        {showSharedSections && (
          <div className="mt-6 border-t border-slate-200 pt-8 print-break-before print-avoid-break print-hidden">
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
          <div
            className="border-t border-slate-200 pt-6 mb-6 print-break-before print-avoid-break pdf-section"
            data-pdf-section="whatyouget"
          >
            <WhatYouGet maxEquipmentWarranty={maxEquipmentWarranty} />
          </div>
        )}

        <div className="border-t border-slate-200 pt-6 print-break-before print-avoid-break print-compact-section">
          <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-700" />
            Componentes del Sistema
          </h4>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 print-compact-card">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-base font-semibold text-slate-900">Paneles solares</p>
                <p className="text-sm text-slate-600">Marcas líderes Tier 1</p>
              </div>
              <p className="text-sm text-slate-600 font-semibold">×{panelComponent?.cantidad ?? system.numPaneles}</p>
            </div>
            <div className="mt-4">
              <StaticBrandRow
                logos={[
                  { alt: 'JA Solar', src: '/ja_solar_square_logo.jpg' },
                  { alt: 'Canadian Solar', src: '/canadian_solar_square_logo.jpg' },
                  { alt: 'LONGi', src: '/longi_square_logo.png' }
                ]}
              />
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>• Potencia: <strong>{panelComponent?.capacityWatts ?? system.potenciaPorPanel}</strong> Watts</p>
              <p>• Dimensiones: {panelComponent?.measurementsM2 ? `${panelComponent.measurementsM2} metros cuadrados` : 'Datos por confirmar'}</p>
              <p>
                • Garantía de producto: <strong>{panelProductWarranty || 'Por confirmar'}</strong>
                {panelProductWarranty ? ' años' : ''}
              </p>
              <p>
                • Garantía de generación: <strong>{panelGenerationWarranty || 'Por confirmar'}</strong>
                {panelGenerationWarranty ? ' años' : ''}
              </p>
            </div>
          </div>

          {microinverterComponent ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 print-compact-card">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-base font-semibold text-slate-900">Microinversor {microinverterComponent.marca}</p>
                  <p className="text-sm text-slate-600">Modelo {microinverterComponent.modelo}</p>
                </div>
                <p className="text-sm text-slate-600 font-semibold">×{microinverterComponent.cantidad}</p>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  • Garantía: <strong>{microWarranty || 'Por confirmar'}</strong>
                  {microWarranty ? ' años' : ''}
                </p>
                <p>• Incluye DTU para monitoreo de generación de energía</p>
              </div>
            </div>
          ) : inverterComponent ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 print-compact-card">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-base font-semibold text-slate-900">Inversor {inverterComponent.marca}</p>
                  <p className="text-sm text-slate-600">Modelo {inverterComponent.modelo}</p>
                </div>
                <p className="text-sm text-slate-600 font-semibold">×{inverterComponent.cantidad}</p>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>• Potencia: {inverterComponent.capacityKw ?? inverterComponent.modelo} kW</p>
                <p>
                  • Garantía: <strong>{inverterWarranty || 'Por confirmar'}</strong>
                  {inverterWarranty ? ' años' : ''}
                </p>
              </div>
            </div>
          ) : null}

          {montajeComponent && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
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
                <p>
                  • Garantía: <strong>{montajeWarranty || 'Por confirmar'}</strong>
                  {montajeWarranty ? ' años' : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 print-avoid-break print-break-after print-compact-card">
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Nota:</strong> Esta es una cotización preliminar basada en la información proporcionada.
            El precio final se ajustará tras la visita técnica gratuita donde validaremos las condiciones específicas de tu instalación.
          </p>
        </div>
      </div>
    </div>
  );
}

function SharedSections({
  onClose,
  maxEquipmentWarranty,
  forcePdfOpen = false
}: {
  onClose: () => void;
  maxEquipmentWarranty: number;
  forcePdfOpen?: boolean;
}) {
  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-hidden">
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

      <div
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-break-before print-avoid-break print-compact-card pdf-section"
        data-pdf-section="whatyouget"
      >
        <WhatYouGet maxEquipmentWarranty={maxEquipmentWarranty} />
      </div>

      <div className="print-hidden">
        <TopBrandsSection />
      </div>

      <div
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-avoid-break print-break-after print-compact-card pdf-section"
        data-pdf-section="process"
      >
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
            href={CALENDLY_URL}
            onClick={openCalendlyPopup}
            className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 shadow-lg cursor-pointer"
            style={{ background: '#ff5c36', color: 'white' }}
            target="_blank"
            rel="noreferrer noopener"
          >
            Agendar visita técnica gratuita
          </a>
          <p className="text-xs text-slate-500 mt-2">Agenda tu cita ahora · Sin compromiso</p>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 pdf-section"
        data-pdf-section="faq"
      >
        <h3 className="text-2xl font-bold mb-6" style={{ color: '#1e3a2b' }}>Preguntas Frecuentes</h3>
        <FAQAccordion forceOpen={forcePdfOpen} />

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-slate-700 mb-4">¿Tienes más preguntas? Hablemos</p>
          <a
            href={CALENDLY_URL}
            onClick={openCalendlyPopup}
            className="inline-block px-8 py-3 rounded-xl font-bold transition-all hover:opacity-90 cursor-pointer"
            style={{ background: '#ff5c36', color: 'white' }}
            target="_blank"
            rel="noreferrer noopener"
          >
            Agendar visita técnica gratuita
          </a>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl shadow-lg border-2 p-8 md:p-12 text-center pdf-section"
        style={{ borderColor: '#ff9b7a' }}
        data-pdf-section="cta"
      >
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1e3a2b' }}>
          Da el Primer Paso Hacia Tu Independencia Energética
        </h3>
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
          Agenda tu visita técnica <strong>100% gratuita</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
        </p>
        <a
          href={CALENDLY_URL}
          onClick={openCalendlyPopup}
          className="inline-block px-12 py-5 rounded-xl font-bold text-xl transition-all hover:opacity-90 shadow-2xl mb-4 cursor-pointer"
          style={{ background: '#ff5c36', color: 'white' }}
          target="_blank"
          rel="noreferrer noopener"
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

function FAQAccordion({ forceOpen = false }: { forceOpen?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('print');

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsPrintMode(event.matches);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange as (event: MediaQueryListEvent) => void);

    return () => {
      mediaQuery.removeEventListener('change', handleChange as (event: MediaQueryListEvent) => void);
    };
  }, []);

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
          {(forceOpen || isPrintMode || openIndex === index) && (
            <div className="px-5 pb-5 pt-0 faq-answer">
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
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [forcePdfOpen, setForcePdfOpen] = useState(false);
  const creationDate = useMemo(() => new Date(), []);
  const validUntil = useMemo(() => addDays(creationDate, 7), [creationDate]);

  const handleDownloadPDF = async () => {
    setForcePdfOpen(true);

    await new Promise(resolve => requestAnimationFrame(() => resolve(null)));

    const proposalNode = document.querySelector('.proposal-scroll');

    if (!proposalNode) {
      setDownloadError('No pudimos encontrar la propuesta para exportarla.');
      setForcePdfOpen(false);
      return;
    }

    const baseUrl = window.location.origin;
    const toAbsoluteUrl = (url: string | null) => {
      if (!url) return '';
      try {
        return new URL(url, baseUrl).toString();
      } catch {
        return url;
      }
    };

    const clone = proposalNode.cloneNode(true) as HTMLElement;

    clone.classList.add('pdf-export-root');
    clone.style.minHeight = 'auto';
    clone.style.padding = '0';
    clone.style.background = 'transparent';
    clone.style.position = 'static';

    clone.querySelectorAll('.no-print, .print-hidden').forEach(node => node.parentElement?.removeChild(node));

    clone.querySelectorAll('.calendly-inline-widget').forEach(el => el.remove());
    clone.querySelectorAll('.print-cta').forEach(el => {
      (el as HTMLElement).style.display = 'block';
    });

    const origin = window.location.origin;

    clone.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src) img.setAttribute('src', toAbsoluteUrl(src));
    });

    clone.querySelectorAll('source').forEach(source => {
      const srcset = source.getAttribute('srcset');
      if (!srcset) return;

      const absoluteSrcset = srcset
        .split(',')
        .map(entry => {
          const [url, descriptor] = entry.trim().split(/\s+/, 2);
          return `${toAbsoluteUrl(url)}${descriptor ? ` ${descriptor}` : ''}`;
        })
        .join(', ');

      source.setAttribute('srcset', absoluteSrcset);
    });

    clone.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;

      try {
        const abs = new URL(href, origin).toString();
        a.setAttribute('href', abs);
      } catch {
        // ignore
      }
    });

    clone.querySelectorAll('details').forEach(details => {
      (details as HTMLDetailsElement).open = true;
    });

    clone.querySelectorAll('.faq-answer').forEach(answer => {
      (answer as HTMLElement).style.display = 'block';
    });

    const sameOriginStylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(link => toAbsoluteUrl(link.getAttribute('href')))
      .filter(Boolean)
      .filter(href => {
        try {
          const url = new URL(href);
          return url.origin === origin;
        } catch {
          return false;
        }
      });

    const stylesheetLinksResults = await Promise.all(
      sameOriginStylesheets.map(async href => {
        try {
          const res = await fetch(href);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.text();
        } catch (error) {
          console.warn('No pudimos inlinear stylesheet', href, error);
          return '';
        }
      })
    );

    const inlineStyles = [
      ...stylesheetLinksResults.filter(Boolean),
      ...Array.from(document.querySelectorAll('style')).map(styleTag => styleTag.textContent || '')
    ];

    const reorganizeForPdf = (root: HTMLElement) => {
      const hero = root.querySelector('[data-pdf-section="hero"]') as HTMLElement | null;
      const overviewSections = Array.from(root.querySelectorAll('[data-pdf-section="overview"]')) as HTMLElement[];
      const investmentSections = Array.from(root.querySelectorAll('[data-pdf-section="investment"]')) as HTMLElement[];
      const whatYouGetSections = Array.from(root.querySelectorAll('[data-pdf-section="whatyouget"]')) as HTMLElement[];
      const componentSections = Array.from(root.querySelectorAll('[data-pdf-section="components"]')) as HTMLElement[];
      const processSection = root.querySelector('[data-pdf-section="process"]') as HTMLElement | null;
      const faqSection = root.querySelector('[data-pdf-section="faq"]') as HTMLElement | null;
      const ctaSection = root.querySelector('[data-pdf-section="cta"]') as HTMLElement | null;

      const createGrid = (nodes: HTMLElement[], extraClass = '') => {
        const grid = document.createElement('div');
        grid.className = `pdf-inline-grid ${nodes.length > 1 ? 'pdf-inline-grid-double' : ''} ${extraClass}`.trim();
        nodes.forEach(node => grid.appendChild(node));
        return grid;
      };

      const stack = document.createElement('div');
      stack.className = 'pdf-stack';

      const normalizeSpacing = (nodes: HTMLElement[]) => {
        nodes.forEach(node => {
          node.style.marginTop = '0';
          node.style.marginBottom = '4mm';
        });
      };

      const addPage = (className: string, nodes: (HTMLElement | null)[]) => {
        const filtered = nodes.filter(Boolean) as HTMLElement[];
        if (!filtered.length) return;
        normalizeSpacing(filtered);
        const page = document.createElement('section');
        page.className = `pdf-page ${className}`.trim();
        const card = document.createElement('div');
        card.className = 'pdf-page-card';
        filtered.forEach(node => card.appendChild(node));
        page.appendChild(card);
        stack.appendChild(page);
      };

      const investmentGrid = investmentSections.length ? createGrid(investmentSections) : null;
      const benefitsSource = whatYouGetSections.length ? [whatYouGetSections[0]] : [];
      const benefitsGrid = benefitsSource.length ? createGrid(benefitsSource, 'pdf-inline-grid-stack') : null;

      addPage('page-1', [hero, overviewSections.length ? createGrid(overviewSections) : null]);
      addPage('page-2', [investmentGrid, benefitsGrid]);
      addPage('page-3', [componentSections.length ? createGrid(componentSections) : null]);
      addPage('page-4', [processSection]);
      addPage('page-5', [faqSection]);
      addPage('page-6', [ctaSection]);

      if (stack.childElementCount === 0) return;

      root.className = 'pdf-wrapper';
      root.removeAttribute('style');
      root.innerHTML = '';
      root.appendChild(stack);
    };

    reorganizeForPdf(clone);

    const pdfStyles = `
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body.pdf-root { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* Asegura que el print CSS del sitio no oculte todo */
  @media print {
    body.pdf-root *, body.pdf-root *::before, body.pdf-root *::after {
      visibility: visible !important;
    }
  }

  /* Neutraliza utilidades viejas de print para que NO metan saltos raros */
  .print-break-after, .print-break-before {
    break-after: auto !important;
    page-break-after: auto !important;
    break-before: auto !important;
    page-break-before: auto !important;
  }
  .print-avoid-break {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }

  /* Calendly en PDF: ocultar embed, mostrar CTA */
  .calendly-inline-widget { display: none !important; height: auto !important; }
  .print-cta { display: block !important; background: transparent !important; padding: 0 !important; box-shadow: none !important; }
  .print-cta a { background: #ff5c36 !important; color: #fff !important; box-shadow: none !important; border: none !important; }
  .print-cta p { color: #475569 !important; margin-top: 6px !important; }
  .pdf-page a.shadow-lg, .pdf-page a.shadow-xl, .pdf-page a.shadow-2xl, .pdf-page a.shadow, .pdf-page a.shadow-md {
    box-shadow: none !important;
  }

  .pdf-wrapper { background: #fff; }
  .pdf-stack {
    width: 210mm;
    margin: 0 auto;
    background: #fff;
  }

  .pdf-page.page-2 .pdf-page-card { padding: 6mm; gap: 4mm; }

  .pdf-whatyouget h4 { margin-bottom: 3mm; font-size: 15px; }
  .pdf-whatyouget-shell { padding: 5mm !important; }
  .pdf-whatyouget-grid { gap: 3mm 4mm !important; font-size: 12px !important; line-height: 1.35 !important; }

  /* Cada .pdf-page arranca en página nueva */
  .pdf-page {
    break-before: page;
    page-break-before: always;
    break-after: page;
    page-break-after: always;
    padding: 10mm;
    box-sizing: border-box;
    background: #fff;
  }
  .pdf-page:first-child {
    break-before: auto;
    page-break-before: auto;
  }
  .pdf-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  .pdf-page-card {
    border-radius: 12px;
    padding: 8mm;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 10px rgba(15,23,42,0.12);
    box-sizing: border-box;
    background: #fff;
  }

  .pdf-inline-grid { display: grid; gap: 6mm; width: 100%; align-items: start; }
  .pdf-inline-grid-double { grid-template-columns: 1fr 1fr; }
  .pdf-inline-grid > * { width: 100%; }

  .pdf-page, .pdf-page-card, .pdf-section, .pdf-inline-grid {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  img { max-width: 100%; height: auto; }

  /* Por si algo del layout original mete padding raro */
  .proposal-scroll { background: transparent !important; padding: 0 !important; }
`;


    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${inlineStyles.join('\n')}</style>
  <style>${pdfStyles}</style>
</head>
<body class="pdf-root">
  ${clone.outerHTML}
</body>
</html>
`;

    setIsDownloading(true);
    setDownloadError('');

    try {
      const apiBase =
        import.meta.env.VITE_PROPOSAL_API_BASE ?? import.meta.env.VITE_API_BASE ?? '';

        const response = await fetch(`${apiBase}/api/proposal_pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html,
            fileName: `propuesta-${firstName.toLowerCase() || 'solarya'}.pdf`,
            landscape: false
          })
        });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('PDF function responded with an error', response.status, errorText);
        throw new Error('No pudimos generar el PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `propuesta-${firstName.toLowerCase() || 'solarya'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF', error);
      setDownloadError('No pudimos generar el PDF. Inténtalo de nuevo.');
    } finally {
      setIsDownloading(false);
      setForcePdfOpen(false);
    }
  };

  const handleGenerateReferral = async () => {
    setShowReferralModal(true);
    setReferralLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          email: '', // Could be captured from form if available
          whatsapp: '' // Could be captured from form if available
        })
      });

      const data = await response.json();
      if (data.ok && data.link) {
        setReferralLink(data.link);
      }
    } catch (error) {
      console.error('Error generating referral:', error);
    } finally {
      setReferralLoading(false);
    }
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
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .app-main-content {
            display: none !important;
          }
          .proposal-overlay, .proposal-overlay * {
            visibility: visible;
          }
          .proposal-overlay, .proposal-scroll {
            position: static !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            padding: 8px 10px !important;
            width: 100% !important;
          }
          .calendly-inline-widget {
            display: none !important;
          }
          .print-hidden {
            display: none !important;
          }
          .print-cta {
            display: block !important;
          }
          .print-break-before {
            break-before: page;
            page-break-before: always;
          }
          .print-break-after {
            break-after: page;
            page-break-after: always;
          }
          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-compact-card {
            padding: 14px 16px !important;
            margin-bottom: 12px !important;
          }
          .print-compact-grid {
            gap: 12px !important;
          }
          .print-compact-section {
            padding-top: 10px !important;
            padding-bottom: 10px !important;
          }
          .print-compact-heading {
            margin-bottom: 12px !important;
          }
          .print-compact-text {
            margin-bottom: 8px !important;
            line-height: 1.3 !important;
          }
          .print-page {
            break-after: page;
            page-break-after: always;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-last-page {
            break-after: avoid;
            page-break-after: auto;
          }
          .faq-answer {
            display: block !important;
          }
          @page {
            margin: 0.5cm;
            size: letter;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white !important;
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
        .print-hidden {
          display: block;
        }
      `}</style>
        <div className="min-h-screen bg-slate-50 py-8 px-4 relative proposal-scroll">
          <div className="fixed top-6 right-6 z-50 flex gap-3 no-print">
            <button
              onClick={handleGenerateReferral}
              className="w-12 h-12 bg-green-500 rounded-full shadow-lg border border-green-600 flex items-center justify-center hover:bg-green-600 transition-all"
              aria-label="Referir a un amigo"
              title="Referir a un amigo"
            >
              <Share2 className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className={`w-12 h-12 bg-white rounded-full shadow-lg border border-slate-300 flex items-center justify-center transition-all ${
                isDownloading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-100'
              }`}
              aria-label="Descargar PDF"
              aria-busy={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="w-6 h-6 text-slate-700 animate-spin" />
              ) : (
                <Download className="w-6 h-6 text-slate-700" />
              )}
            </button>
            <button
              onClick={onClose}
              className="w-12 h-12 bg-white rounded-full shadow-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-all"
              aria-label="Cerrar propuesta"
            >
              <X className="w-6 h-6 text-slate-700" />
            </button>
          </div>

          {downloadError && (
            <div className="fixed top-20 right-6 z-50 bg-red-50 text-red-800 border border-red-200 shadow-lg rounded-xl px-4 py-3 text-sm max-w-xs no-print">
              {downloadError}
            </div>
          )}

          <div className="max-w-6xl mx-auto">
            <div
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-compact-card"
              data-pdf-section="hero"
            >
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
              <p className="text-sm text-slate-600">{formatLongDate(creationDate)}</p>
            </div>
          </div>
        </div>

        {proposal.future && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 print-hidden">
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
              <ProposalCard
                data={proposal.current}
                title="Propuesta para Consumo Actual"
                onClose={onClose}
                showSharedSections={false}
                validUntil={validUntil}
                forcePdfOpen={forcePdfOpen}
              />
              {showFutureProposal && (
                <ProposalCard
                  data={proposal.future}
                  title="Propuesta con Cargas Futuras"
                  onClose={onClose}
                  showSharedSections={false}
                  validUntil={validUntil}
                  forcePdfOpen={forcePdfOpen}
                />
              )}
            </div>
            <SharedSections
              onClose={onClose}
              maxEquipmentWarranty={getMaxProductWarranty([
                ...proposal.current.components,
                ...(proposal.future?.components ?? [])
              ])}
              forcePdfOpen={forcePdfOpen}
            />
          </>
        ) : (
          <div className="mb-8">
            <ProposalCard
              data={proposal.current}
              title="Tu Propuesta Personalizada de Sistema de Paneles Solares"
              onClose={onClose}
              validUntil={validUntil}
              forcePdfOpen={forcePdfOpen}
            />
          </div>
        )}

        {!proposal.future && (
          <>
            <div className="print-hidden">
              <TopBrandsSection />
            </div>

            <div
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-avoid-break print-break-after print-compact-card pdf-section"
              data-pdf-section="process"
            >
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
                  href={CALENDLY_URL}
                  onClick={openCalendlyPopup}
                  className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 shadow-lg cursor-pointer"
                  style={{ background: '#ff5c36', color: 'white' }}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Agendar visita técnica gratuita
                </a>
                <p className="text-xs text-slate-500 mt-2">Agenda tu cita ahora · Sin compromiso</p>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-break-before print-avoid-break print-compact-card pdf-section"
              data-pdf-section="faq"
            >
              <h3 className="text-2xl font-bold mb-6" style={{ color: '#1e3a2b' }}>Preguntas Frecuentes</h3>
              <FAQAccordion forceOpen={forcePdfOpen} />

              <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                <p className="text-slate-700 mb-4">¿Tienes más preguntas? Hablemos</p>
                <a
                  href={CALENDLY_URL}
                  onClick={openCalendlyPopup}
                  className="inline-block px-8 py-3 rounded-xl font-bold transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: '#ff5c36', color: 'white' }}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Agendar visita técnica gratuita
                </a>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl shadow-lg border-2 p-8 md:p-12 text-center print-last-page print-avoid-break print-compact-card pdf-section"
              style={{ borderColor: '#ff9b7a' }}
              data-pdf-section="cta"
            >
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#1e3a2b' }}>
            Da el Primer Paso Hacia Tu Independencia Energética
          </h3>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Agenda tu visita técnica <strong>100% gratuita</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
          </p>
          <a
            href={CALENDLY_URL}
            onClick={openCalendlyPopup}
            className="inline-block px-12 py-5 rounded-xl font-bold text-xl transition-all hover:opacity-90 shadow-2xl mb-4 cursor-pointer"
            style={{ background: '#ff5c36', color: 'white' }}
            target="_blank"
            rel="noreferrer noopener"
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

      {/* Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] no-print" onClick={() => setShowReferralModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Comparte con tus amigos!</h3>
              <p className="text-slate-600">
                Ayuda a alguien más a ahorrar en su recibo de luz compartiendo este enlace
              </p>
            </div>

            {referralLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : referralLink ? (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">Tu enlace único:</p>
                  <p className="text-sm font-mono text-slate-900 break-all">{referralLink}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-semibold transition-colors"
                  >
                    {referralCopied ? (
                      <>
                        <Check className="w-5 h-5" />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copiar
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>
                </div>

                <p className="text-xs text-center text-slate-500 mt-4">
                  Los referidos que entren por tu enlace quedarán registrados en tu nombre
                </p>
              </div>
            ) : (
              <p className="text-center text-slate-600 py-4">
                Hubo un error al generar tu enlace. Por favor intenta de nuevo.
              </p>
            )}

            <button
              onClick={() => setShowReferralModal(false)}
              className="w-full mt-6 px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
const CALENDLY_URL = 'https://calendly.com/narciso-solarya/30min';

