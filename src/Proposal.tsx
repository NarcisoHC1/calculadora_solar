import { useState } from 'react';
import { ProposalData, DualProposal } from './types';
import { X, Zap, TrendingDown, TreePine, Calendar, Shield, Plus, Minus, Download, CheckCircle2, Clock } from 'lucide-react';

interface ProposalProps {
  proposal: DualProposal;
  onClose: () => void;
  userName: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  return parts[0].toUpperCase();
}

function ProposalCard({ data, title }: { data: ProposalData; title: string }) {
  const { system, financial, environmental, components, porcentajeCobertura, showDACWarning, dacBimonthlyPayment, dacFinancial } = data;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-6 md:p-8">
        <h3 className="text-2xl font-bold mb-6" style={{ color: '#1e3a2b' }}>{title}</h3>

        <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
          <div className="flex items-center justify-center mb-4">
            <TrendingDown className="w-5 h-5" style={{ color: '#ff5c36' }} />
            <h4 className="text-base font-bold text-slate-900 ml-2">Tu Ahorro</h4>
          </div>

          <div className="flex items-center justify-center gap-6 mb-5 flex-wrap">
            <div className="text-center">
              <div className="text-xs font-semibold text-slate-600 mb-1">PAGAS AHORA</div>
              <div className="text-3xl font-bold text-slate-700 line-through">{formatCurrency(financial.pagoAhora)}</div>
            </div>
            <div className="text-4xl font-bold" style={{ color: '#ff5c36' }}>→</div>
            <div className="text-center">
              <div className="text-xs font-semibold text-slate-600 mb-1">PAGARÁS</div>
              <div className="text-3xl font-bold" style={{ color: '#3cd070' }}>{formatCurrency(financial.pagoFuturo)}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 text-center border-2" style={{ borderColor: '#ff5c36' }}>
            <p className="text-xs font-semibold text-slate-600 mb-1">AHORRO CADA BIMESTRE</p>
            <p className="text-4xl font-bold" style={{ color: '#ff5c36' }}>
              {formatCurrency(financial.ahorroBimestral)}
            </p>
          </div>
        </div>

        {showDACWarning && dacBimonthlyPayment && dacFinancial && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-bold text-amber-900 mb-2">⚠️ Advertencia DAC</p>
            <p className="text-sm text-amber-800">
              Tu consumo de <strong>{Math.round(data.input.consumoKwh || 0)} kWh</strong> bimestrales te hace candidato para tarifa DAC (tarifa residencial de alto consumo). Si caes en DAC, tu pago será de <strong>{formatCurrency(dacBimonthlyPayment)}</strong> al bimestre. Con paneles solares en DAC: pagarás <strong>{formatCurrency(dacFinancial.pagoFuturo)}</strong> y ahorrarás <strong>{formatCurrency(dacFinancial.ahorroBimestral)}</strong> al bimestre.
            </p>
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
            <p className="text-3xl font-bold mb-2" style={{ color: '#1e3a2b' }}>{(system.potenciaTotal / 1000).toFixed(1)} kilowatts</p>
            <div className="space-y-1 text-sm text-slate-600">
              <p><strong className="text-slate-900">{system.numPaneles}</strong> paneles solares de <strong className="text-slate-900">{system.potenciaPorPanel}</strong> watts</p>
              <p>Energía generada: <strong className="text-slate-900">{Math.round(system.generacionMensualKwh)}</strong> kWh/mes</p>
              <p>Generas <strong className="text-slate-900">{porcentajeCobertura.toFixed(0)}%</strong> de la energía que consumes</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#1e3a2b' }}>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Retorno de Inversión</h5>
            </div>
            <p className="text-3xl font-bold mb-2" style={{ color: '#1e3a2b' }}>{financial.anosRetorno.toFixed(1)} años</p>
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
            <p className="text-sm font-bold text-slate-900 mb-3">Pago en 2 exhibiciones:</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-600 mb-1">Anticipo 50%</p>
                <p className="text-xl font-bold" style={{ color: '#1e3a2b' }}>{formatCurrency(financial.anticipo)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Pago final 50%</p>
                <p className="text-xl font-bold" style={{ color: '#1e3a2b' }}>{formatCurrency(financial.pagoPostInterconexion)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-6">
          <h4 className="text-xl font-bold text-slate-900 mb-6">¿Qué Obtienes con Tu Sistema Solar?</h4>

          <div className="mb-6">
            <h5 className="text-base font-bold text-slate-900 mb-3">Beneficios Económicos</h5>
            <div className="space-y-2 text-sm text-slate-700">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <span><strong>{formatCurrency(financial.ahorroBimestral * 6 * 25)}</strong> ahorrados en 25 años</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <span>Recuperación de tu inversión en <strong>{financial.anosRetorno.toFixed(1)} años</strong></span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <span>Aumenta el valor de tu propiedad</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <span>Protección contra subidas de precios de CFE</span>
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h5 className="text-base font-bold text-slate-900 mb-3">Servicios y Garantías Incluidas</h5>
            <div className="space-y-2 text-sm text-slate-700">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <span>Instalación profesional por técnicos certificados</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <span>Trámites CFE completamente gratis</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <span>App de monitoreo en tiempo real</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <span>2 años garantía instalación</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <span>12 años garantía en equipos</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3cd070' }} />
                <span>25 años garantía generación de energía</span>
              </p>
            </div>
          </div>

          <div>
            <h5 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TreePine className="w-5 h-5" style={{ color: '#3cd070' }} />
              Impacto Ambiental
            </h5>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-3xl mb-2">🌳</div>
                <p className="text-2xl font-bold" style={{ color: '#1e3a2b' }}>{environmental.arboles}</p>
                <p className="text-xs text-slate-600 font-semibold mt-1">árboles/año</p>
              </div>
              <div className="text-center bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-3xl mb-2">🛢️</div>
                <p className="text-2xl font-bold" style={{ color: '#1e3a2b' }}>{environmental.barrilesPetroleo}</p>
                <p className="text-xs text-slate-600 font-semibold mt-1">barriles/año</p>
              </div>
              <div className="text-center bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-3xl mb-2">☁️</div>
                <p className="text-2xl font-bold" style={{ color: '#1e3a2b' }}>{environmental.toneladasCO2}</p>
                <p className="text-xs text-slate-600 font-semibold mt-1">ton CO₂/año</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-700" />
            Componentes del Sistema
          </h4>
          <div className="space-y-3">
            {components.map((comp, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div>
                  <p className="font-bold text-slate-900">{comp.concepto}</p>
                  <p className="text-sm text-slate-600 mt-1">{comp.marca} · {comp.modelo}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold" style={{ color: '#ff5c36' }}>×{comp.cantidad}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mt-6">
          <h4 className="text-xl font-bold text-slate-900 mb-6">Usamos Sólo las Mejores Marcas</h4>
          <p className="text-sm text-slate-700 mb-6">Nuestras marcas son líderes mundiales:</p>

          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h5 className="font-bold text-slate-900 mb-2">JA Solar (paneles solares)</h5>
              <ul className="space-y-1 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>#3 mundial en fabricación de paneles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Más de 90GW instalados globalmente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Tecnología Avanzada bifacial N-Type de Última generación</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>+5% más eficiente que tecnología tradicional</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Menor degradación anual</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Certificaciones IEC 61215/61730 y UL 1703 (Estados Unidos)</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h5 className="font-bold text-slate-900 mb-2">Hoymiles (microinversores)</h5>
              <ul className="space-y-1 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Líder global en tecnología de microinversores</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Más de 5 millones de unidades instaladas mundialmente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Eficiencia de conversión hasta 97.3%</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Monitoreo individual por panel en tiempo real</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Certificaciones IEEE 1547, UL 1741, FCC Part 15</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h5 className="font-bold text-slate-900 mb-2">Growatt (inversores string)</h5>
              <ul className="space-y-1 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Top 10 mundial en fabricación de inversores</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Más de 3 millones de inversores instalados globalmente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Eficiencia máxima hasta 98.75%</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Protección IP65 contra polvo y agua</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Certificaciones IEC, CE, G98, G99</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h5 className="font-bold text-slate-900 mb-2">Schletter (sistema de montaje)</h5>
              <ul className="space-y-1 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Líder alemán en estructuras de montaje solar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Más de 16 GW de sistemas instalados mundialmente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Aluminio y acero inoxidable de grado marino</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Diseño optimizado para resistencia a vientos y cargas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  <span>Garantía de 25 años en estructura</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mt-6">
          <h4 className="text-xl font-bold text-slate-900 mb-6">Proceso y Tiempos</h4>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: '#ff5c36' }}>
                1
              </div>
              <div className="flex-1">
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

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: '#ff5c36' }}>
                2
              </div>
              <div className="flex-1">
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

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: '#ff5c36' }}>
                3
              </div>
              <div className="flex-1">
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

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: '#ff5c36' }}>
                4
              </div>
              <div className="flex-1">
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

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 font-semibold">
              ⏱️ Tiempo total estimado: 4-6 semanas desde la visita hasta interconexión completa
            </p>
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

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 relative">
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-50 w-12 h-12 bg-white rounded-full shadow-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-all"
        aria-label="Cerrar propuesta"
      >
        <X className="w-6 h-6 text-slate-700" />
      </button>

      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <img
                src="/SolarYa logos_-o- icon.png"
                alt="SolarYa"
                className="w-16 h-16 md:w-20 md:h-20"
              />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#1e3a2b' }}>SolarYa</h1>
                <p className="text-slate-600">Tu solución solar personalizada</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">Esta es tu propuesta, {firstName}</p>
              <p className="text-sm text-slate-600">{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {proposal.future && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <p className="text-sm text-blue-900">
              <strong>💡 Planificación inteligente:</strong> Hemos preparado dos propuestas para ti.
              La segunda considera las cargas adicionales que planeas instalar, asegurando que tu sistema crezca con tus necesidades.
            </p>
          </div>
        )}

        {proposal.future ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ProposalCard data={proposal.current} title="Propuesta para Consumo Actual" />
            <ProposalCard data={proposal.future} title="Propuesta con Cargas Futuras" />
          </div>
        ) : (
          <div className="mb-8">
            <ProposalCard data={proposal.current} title="Tu Propuesta Personalizada de Sistema de Paneles Solares" />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6" style={{ color: '#1e3a2b' }}>Preguntas Frecuentes</h3>
          <FAQAccordion />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 text-center" style={{ borderTop: '4px solid #ff5c36' }}>
          <div className="text-5xl mb-4">🚀</div>
          <h3 className="text-2xl font-bold mb-3" style={{ color: '#1e3a2b' }}>¿Listo para comenzar?</h3>
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            Nuestro equipo de expertos está listo para agendar tu visita técnica gratuita y comenzar tu transformación energética
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
              style={{ background: '#ff5c36', color: 'white' }}
            >
              Agendar visita técnica gratuita
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 rounded-xl font-semibold transition-all hover:bg-slate-50"
              style={{ borderColor: '#1e3a2b', color: '#1e3a2b' }}
            >
              Tengo preguntas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
