import { useState, useEffect, useMemo } from 'react';
import { ProposalData, DualProposal, EnvironmentalImpact, ComponentBreakdown } from './types';
import { X, Zap, TrendingDown, TreePine, Calendar, Shield, Plus, Minus, Download, CheckCircle2, Clock, Share2, Copy, Check } from 'lucide-react';

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
          className="flex items-center justify-center w-24 h-24 rounded-xl bg-white border border-slate-200 shadow-sm print-compact-brand"
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
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-hidden">
      <h4 className="text-xl font-bold text-slate-900 mb-4">Usamos Sólo las Mejores Marcas</h4>
      <p className="text-sm text-slate-600 mb-6">Líderes mundiales en tecnología solar</p>
      <BrandCarousel logos={TOP_BRAND_LOGOS} className="py-2" />
    </div>
  );
}

function WhatYouGet({ maxEquipmentWarranty }: { maxEquipmentWarranty: number }) {
  return (
    <>
      <h4 className="text-xl font-bold text-slate-900 mb-6 print-compact-heading">¿Qué Obtienes con Tu Sistema Solar?</h4>
      <div className="bg-slate-50 border-2 rounded-xl p-6 mb-6 print-compact-card" style={{ borderColor: '#ff9b7a' }}>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-base text-slate-700 leading-relaxed print-text-sm">
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
    <>
      <div className="mt-6 print-hidden">
        <div
          className="calendly-inline-widget"
          data-url="https://calendly.com/narciso-solarya/30min"
          style={{ minWidth: '320px', height: '700px' }}
        />
      </div>
      <div className="print-cta mt-6 text-center print-hidden">
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

function ProposalCard({ data, title, onClose, showSharedSections = true, validUntil }: {
  data: ProposalData;
  title: string;
  onClose: () => void;
  showSharedSections?: boolean;
  validUntil: Date
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
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden print-no-shadow print-no-border print-p-0">
      <div className="p-6 md:p-8 print-p-0">
        
        {/* --- PAGE 1 CONTENT START --- */}
        <h3 className="text-2xl font-bold mb-6 print-compact-heading print-text-xl" style={{ color: '#1e3a2b' }}>{title}</h3>

        <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200 print-compact-card">
          <div className="flex items-center justify-center mb-4 print-mb-2">
            <TrendingDown className="w-5 h-5" style={{ color: '#ff5c36' }} />
            <h4 className="text-base font-bold text-slate-900 ml-2">Tu Ahorro con SolarYa</h4>
          </div>

          <div className="flex items-center justify-center gap-6 mb-5 flex-wrap print-mb-3">
            <div className="text-center">
              <div className="text-xs font-semibold text-slate-600 mb-1">PAGAS AHORA A CFE</div>
              <div className="text-3xl font-bold text-slate-700 line-through print-text-2xl">{formatCurrency(financial.pagoAhora)}</div>
            </div>
            <div className="text-4xl font-bold print-text-2xl" style={{ color: '#ff5c36' }}>→</div>
            <div className="text-center">
              <div className="text-xs font-semibold text-slate-600 mb-1">CON SOLARYA PAGARÁS</div>
              <div className="text-3xl font-bold print-text-2xl" style={{ color: '#3cd070' }}>{formatCurrency(financial.pagoFuturo)}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 text-center border-2 print-compact-card-inner" style={{ borderColor: '#ff9b7a' }}>
            <p className="text-xs font-semibold text-slate-600 mb-1">AHORRAS CADA BIMESTRE</p>
            <p className="text-4xl font-bold print-text-3xl" style={{ color: '#ff5c36' }}>
              {formatCurrency(financial.ahorroBimestral)}
            </p>
          </div>
        </div>

        {showDACWarning && dacBimonthlyPayment !== undefined && dacFinancial && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 print-compact-card">
            <p className="text-sm font-bold text-amber-900 mb-3">⚠️ Advertencia Tarifa DAC</p>
            <ul className="space-y-2 text-sm text-amber-800 print-text-xs">
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Tu consumo bimestral de energía es alto.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>En DAC pagarías <strong>{formatCurrency(dacBimonthlyPayment)}</strong>/bimestre.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-900 font-bold mt-0.5">•</span>
                <span>Ahorro vs DAC: <strong>{formatCurrency(dacBimonthlyPayment - financial.pagoFuturo)}</strong>.</span>
              </li>
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print-mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#ff5c36' }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Tu Sistema Solar</h5>
            </div>
            <p className="text-3xl font-bold mb-2 print-text-xl" style={{ color: '#1e3a2b' }}>{safeToFixed(system.potenciaTotal / 1000, 1)} kilowatts</p>
            <div className="space-y-1 text-sm text-slate-600 print-text-xs">
              <p><strong className="text-slate-900">{system.numPaneles}</strong> paneles solares</p>
              <p>Generación: <strong className="text-slate-900">{Math.round(system.generacionMensualKwh * 2)}</strong> kWh/bimestre</p>
              <p>Cobertura: <strong className="text-slate-900">{safeToFixed(porcentajeCobertura, 0)}%</strong> de tu consumo</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#1e3a2b' }}>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Retorno de Inversión</h5>
            </div>
            <p className="text-3xl font-bold mb-2 print-text-xl" style={{ color: '#1e3a2b' }}>{safeToFixed(financial.anosRetorno, 1)} años</p>
            <div className="space-y-1 text-sm text-slate-600 print-text-xs">
              <p>Ahorro en 25 años:</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency((financial.ahorroEn25 ?? (financial.ahorroBimestral * 6 * 25)))}</p>
            </div>
          </div>
        </div>

        {/* --- PAGE BREAK 1: End of Header/System/ROI --- */}
        <div className="print-page-break"></div>

        {/* --- PAGE 2 CONTENT START --- */}
        <div className="border-t border-slate-200 pt-6 mb-6 print-border-none print-pt-2">
          <h4 className="text-lg font-bold text-slate-900 mb-4 print-compact-heading">Tu Inversión</h4>
          <div className="bg-slate-50 rounded-xl p-5 space-y-2 border border-slate-200 print-compact-card">
            <div className="flex justify-between text-slate-700 print-text-sm">
              <span>Precio de lista:</span>
              <span className="font-semibold">{formatCurrency(financial.precioLista)}</span>
            </div>
            <div className="flex justify-between font-semibold print-text-sm" style={{ color: '#3cd070' }}>
              <span>Descuento {financial.descuentoPorcentaje ? `(${Math.round(financial.descuentoPorcentaje * 100)}%)` : ''}:</span>
              <span>-{formatCurrency(financial.descuento)}</span>
            </div>
            <div className="flex justify-between text-slate-700 border-t pt-2 print-text-sm">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(financial.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-700 print-text-sm">
              <span>IVA:</span>
              <span className="font-semibold">{formatCurrency(financial.iva)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t print-text-lg" style={{ color: '#1e3a2b' }}>
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
                    <p className="text-lg font-bold print-text-base" style={{ color: '#1e3a2b' }}>{formatCurrency(pago)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 print-compact-card">
            <h5 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TreePine className="w-4 h-4" style={{ color: '#3cd070' }} />
              Impacto ambiental anual
            </h5>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl mb-1">🌳</div>
                <p className="text-xl font-bold print-text-lg" style={{ color: '#1e3a2b' }}>{environmental.arboles}</p>
                <p className="text-xs text-slate-600 mt-0.5">árboles plantados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🛢️</div>
                <p className="text-xl font-bold print-text-lg" style={{ color: '#1e3a2b' }}>{environmental.barrilesPetroleo}</p>
                <p className="text-xs text-slate-600 mt-0.5">barriles evitados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">☁️</div>
                <p className="text-xl font-bold print-text-lg" style={{ color: '#1e3a2b' }}>{environmental.toneladasCO2}</p>
                <p className="text-xs text-slate-600 mt-0.5">kg CO₂ reducidos</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* --- PAGE BREAK 2: End of Investment/Environment --- */}
        <div className="print-page-break"></div>

        {/* --- PAGE 3 CONTENT START --- */}
        {/* Note: Middle CTA is hidden in parent, so we go straight to Components */}
        
        <div className="border-t border-slate-200 pt-6 print-border-none print-pt-2">
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
              <StaticBrandRow logos={[
                { alt: 'JA Solar', src: '/ja_solar_square_logo.jpg' },
                { alt: 'Canadian Solar', src: '/canadian_solar_square_logo.jpg' },
                { alt: 'LONGi', src: '/longi_square_logo.png' }
              ]} />
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700 print-text-xs">
              <p>• Potencia: <strong>{panelComponent?.capacityWatts ?? system.potenciaPorPanel}</strong> Watts</p>
              <p>• Dimensiones: {panelComponent?.measurementsM2 ? `${panelComponent.measurementsM2} m²` : 'Datos por confirmar'}</p>
              <p>
                • Garantía de producto: <strong>{panelProductWarranty || 'Por confirmar'}</strong> {panelProductWarranty ? ' años' : ''}
              </p>
              <p>
                • Garantía de generación: <strong>{panelGenerationWarranty || 'Por confirmar'}</strong> {panelGenerationWarranty ? ' años' : ''}
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
              <div className="mt-3 space-y-2 text-sm text-slate-700 print-text-xs">
                <p>
                  • Garantía: <strong>{microWarranty || 'Por confirmar'}</strong> {microWarranty ? ' años' : ''}
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
              <div className="mt-3 space-y-2 text-sm text-slate-700 print-text-xs">
                <p>• Potencia: {inverterComponent.capacityKw ?? inverterComponent.modelo} kW</p>
                <p>
                  • Garantía: <strong>{inverterWarranty || 'Por confirmar'}</strong> {inverterWarranty ? ' años' : ''}
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
              <div className="mt-3 space-y-2 text-sm text-slate-700 print-text-xs">
                <p>• Material: aluminio de alta resistencia</p>
                <p>• Certificación antisísmica</p>
                <p>• Resistente a corrosión</p>
                <p>
                  • Garantía: <strong>{montajeWarranty || 'Por confirmar'}</strong> {montajeWarranty ? ' años' : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 print-compact-card">
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Nota:</strong> Esta es una cotización preliminar basada en la información proporcionada. El precio final se ajustará tras la visita técnica gratuita donde validaremos las condiciones específicas de tu instalación.
          </p>
        </div>
        
        {/* End of ProposalCard - This aligns with end of Page 3 */}
      </div>
    </div>
  );
}

function SharedSections({ onClose, maxEquipmentWarranty }: { onClose: () => void; maxEquipmentWarranty: number }) {
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

      {/* --- PAGE 4 CONTENT START --- */}
      {/* We need a forced break here before "What You Get" just in case */}
      <div className="print-page-break"></div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-no-shadow print-no-border print-p-0 print-mb-0">
        <WhatYouGet maxEquipmentWarranty={maxEquipmentWarranty} />
        
        <div className="print-hidden">
          <TopBrandsSection />
        </div>

        <h4 className="text-xl font-bold text-slate-900 mb-6 print-mt-6 print-compact-heading">Proceso y Tiempos</h4>
        <div className="relative">
          <div className="absolute left-6 top-12 bottom-12 w-0.5" style={{ background: '#ff5c36' }}></div>
          <div className="space-y-8 print-space-y-4">
            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10 print-w-8 print-h-8 print-text-sm" style={{ background: '#ff5c36' }}>
                1
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4 print-p-3" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900 print-text-sm">Visita Técnica</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1 print-text-xs">
                    <Clock className="w-3 h-3" /> ~1 día
                  </span>
                </div>
                <p className="text-sm text-slate-700 print-text-xs">Evaluación gratuita y propuesta final</p>
              </div>
            </div>
            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10 print-w-8 print-h-8 print-text-sm" style={{ background: '#ff5c36' }}>
                2
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4 print-p-3" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900 print-text-sm">Contrato y Anticipo</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1 print-text-xs">
                    <Clock className="w-3 h-3" /> ~1 día
                  </span>
                </div>
                <p className="text-sm text-slate-700 print-text-xs">Firma y pago del 50%</p>
              </div>
            </div>
            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10 print-w-8 print-h-8 print-text-sm" style={{ background: '#ff5c36' }}>
                3
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4 print-p-3" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900 print-text-sm">Instalación</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1 print-text-xs">
                    <Clock className="w-3 h-3" /> ~5 días
                  </span>
                </div>
                <p className="text-sm text-slate-700 print-text-xs">Sistema funcionando</p>
              </div>
            </div>
            <div className="flex gap-4 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white z-10 print-w-8 print-h-8 print-text-sm" style={{ background: '#ff5c36' }}>
                4
              </div>
              <div className="flex-1 bg-white border-2 rounded-xl p-4 print-p-3" style={{ borderColor: '#ff9b7a' }}>
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-bold text-slate-900 print-text-sm">Interconexión CFE</h5>
                  <span className="text-sm text-slate-600 flex items-center gap-1 print-text-xs">
                    <Clock className="w-3 h-3" /> 2-4 semanas
                  </span>
                </div>
                <p className="text-sm text-slate-700 print-text-xs">Trámites y medidor bidireccional</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-slate-50 border-2 rounded-xl p-4 text-center print-compact-card" style={{ borderColor: '#ff9b7a' }}>
          <p className="text-sm font-semibold" style={{ color: '#1e3a2b' }}>
            ⏱️ Tiempo total estimado: 4-6 semanas desde la visita hasta interconexión completa
          </p>
        </div>

        <div className="mt-6 text-center print-hidden">
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
      
      {/* --- PAGE BREAK 3: End of Page 4 --- */}
      <div className="print-page-break"></div>

      {/* --- PAGE 5 CONTENT START --- */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-no-shadow print-no-border print-p-0 print-mb-4">
        <h3 className="text-2xl font-bold mb-6 print-compact-heading" style={{ color: '#1e3a2b' }}>Preguntas Frecuentes</h3>
        <FAQAccordion />
        <div className="mt-8 pt-6 border-t border-slate-200 text-center print-hidden">
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

      <div className="bg-white rounded-2xl shadow-lg border-2 p-8 md:p-12 text-center print-compact-card" style={{ borderColor: '#ff9b7a' }}>
        <div className="text-6xl mb-4 print-text-4xl">🚀</div>
        <h3 className="text-3xl md:text-4xl font-bold mb-4 print-text-2xl" style={{ color: '#1e3a2b' }}>
          Da el Primer Paso Hacia Tu Independencia Energética
        </h3>
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto print-text-sm print-mb-4">
          Agenda tu visita técnica <strong>100% gratuita</strong> y sin compromiso. Nuestros expertos evaluarán tu propiedad y te entregarán una propuesta personalizada.
        </p>
        
        <div className="print-hidden">
             <a
              href=""
              onClick={openCalendlyPopup}
              className="inline-block px-12 py-5 rounded-xl font-bold text-xl transition-all hover:opacity-90 shadow-2xl mb-4 cursor-pointer"
              style={{ background: '#ff5c36', color: 'white' }}
            >
              Agendar Visita Técnica Gratuita
            </a>
            <p className="text-sm text-slate-500">Respuesta en menos de 24 horas · Sin letra pequeña</p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-8 flex-wrap text-sm text-slate-600 print-mt-4">
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
        
        {/* Print Only Call Info */}
        <div className="hidden print-block mt-6 pt-4 border-t border-slate-200">
             <p className="font-bold text-lg" style={{ color: '#ff5c36' }}>Contáctanos: (55) 1234-5678</p>
             <p className="text-sm text-slate-600">www.solarya.com</p>
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
      question: '¿Qué mantenimiento requiere el sistema?',
      answer: 'Los sistemas solares requieren muy poco mantenimiento. Se recomienda limpiar los paneles 2-3 veces al año (o después de tormentas de polvo) y una revisión técnica anual. Los componentes están diseñados para operar sin problemas durante décadas.'
    }
  ];

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden print-break-inside-avoid">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-100 transition-colors print-p-3"
          >
            <span className="font-bold text-slate-900 pr-4 print-text-sm">{faq.question}</span>
            {openIndex === index ? (
              <Minus className="w-5 h-5 flex-shrink-0 print-hidden" style={{ color: '#ff5c36' }} />
            ) : (
              <Plus className="w-5 h-5 flex-shrink-0 print-hidden" style={{ color: '#ff5c36' }} />
            )}
          </button>
          
          <div className={`px-5 pb-5 pt-0 faq-answer ${openIndex === index ? 'block' : 'hidden'} print-block print-px-3 print-pb-3`}>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line print-text-xs">{faq.answer}</p>
          </div>
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

  const creationDate = useMemo(() => new Date(), []);
  const validUntil = useMemo(() => addDays(creationDate, 7), [creationDate]);

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleGenerateReferral = async () => {
    setShowReferralModal(true);
    setReferralLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: userName,
          email: '',
          whatsapp: ''
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
            body { 
                background: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            @page { 
                size: letter;
                margin: 1cm;
            }
            
            /* Basic resets */
            .no-print, .print-hidden { display: none !important; }
            .print-block { display: block !important; }
            
            /* Page Break Utilities */
            .print-page-break { 
                break-after: page; 
                page-break-after: always; 
                height: 0; 
                display: block; 
                visibility: hidden;
            }
            .print-break-inside-avoid {
                break-inside: avoid;
                page-break-inside: avoid;
            }
            
            /* Sizing & Spacing Reductions for "Compact" Feel */
            .proposal-scroll { 
                padding: 0 !important; 
                overflow: visible !important; 
                height: auto !important; 
            }
            .max-w-6xl { max-width: 100% !important; margin: 0 !important; }
            
            .print-compact-card {
                padding: 12px 16px !important;
                margin-bottom: 12px !important;
                border: 1px solid #e2e8f0 !important;
                box-shadow: none !important;
                border-radius: 8px !important;
            }
            
            .print-p-0 { padding: 0 !important; }
            .print-pt-2 { padding-top: 0.5rem !important; }
            .print-mb-0 { margin-bottom: 0 !important; }
            .print-mb-2 { margin-bottom: 0.5rem !important; }
            .print-mb-4 { margin-bottom: 1rem !important; }
            .print-no-shadow { box-shadow: none !important; }
            .print-no-border { border: none !important; }
            
            /* Typography Scaling */
            h1, h2, h3, h4, h5 { margin-bottom: 8px !important; }
            .print-compact-heading { margin-bottom: 8px !important; font-size: 1.1rem !important; }
            .print-text-sm, p, span, div { font-size: 10pt !important; line-height: 1.3 !important; }
            .print-text-xs { font-size: 9pt !important; line-height: 1.2 !important; }
            .print-text-base { font-size: 11pt !important; }
            .print-text-lg { font-size: 12pt !important; }
            .print-text-xl { font-size: 14pt !important; }
            .print-text-2xl { font-size: 18pt !important; }
            .print-text-3xl { font-size: 22pt !important; }
            .print-text-4xl { font-size: 28pt !important; }
            
            /* Specific overrides */
            .faq-answer { display: block !important; height: auto !important; opacity: 1 !important; visibility: visible !important; }
            .animate-logo-marquee { animation: none !important; }
            
            /* Hide future toggle switch visuals */
            button[role="switch"] { display: none !important; }
        }
        .print-block { display: none; }
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
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8 print-compact-card">
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

          {proposal.future && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 print-hidden">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-blue-900 mb-3">
                    <strong>💡 Planificación inteligente:</strong> Hemos preparado dos propuestas para ti. La segunda considera las cargas adicionales que planeas instalar, asegurando que tu sistema crezca con tus necesidades.
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

          {/* Logic: If Dual Proposal, user wants ONLY Current proposal layout logic in print if toggles are involved, 
            but for PDF consistency we apply the structured layout to whatever is active.
            However, the request implies a specific flow.
          */}
          
          <div className="mb-8">
             {/* If future is enabled and toggled ON, we show future, otherwise current. 
                 For PRINT, the user usually wants the one they are looking at, but structured. 
             */}
            <ProposalCard 
              data={proposal.future && showFutureProposal ? proposal.future : proposal.current} 
              title={proposal.future && showFutureProposal ? "Propuesta con Cargas Futuras" : "Tu Propuesta Personalizada"}
              onClose={onClose} 
              showSharedSections={false} 
              validUntil={validUntil} 
            />
          </div>
          
          <SharedSections 
            onClose={onClose} 
            maxEquipmentWarranty={getMaxProductWarranty([
              ...proposal.current.components,
              ...(proposal.future?.components ?? [])
            ])} 
          />

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
                        <Check className="w-5 h-5" /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" /> Copiar
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
