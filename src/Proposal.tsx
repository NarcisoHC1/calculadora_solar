import { ProposalData, DualProposal } from './types';
import { X, CheckCircle2, Zap, TrendingDown, TreePine, Calendar, Shield, Sparkles } from 'lucide-react';

interface ProposalProps {
  proposal: DualProposal;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function ProposalCard({ data, title, isPrimary }: { data: ProposalData; title: string; isPrimary?: boolean }) {
  const { system, financial, environmental, components, porcentajeCobertura, showDACWarning, dacBimonthlyPayment, dacFinancial } = data;

  return (
    <div className={`bg-white rounded-3xl shadow-2xl border-2 overflow-hidden ${isPrimary ? 'border-green-500' : 'border-slate-200'}`}>
      {isPrimary && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-center py-2 font-bold text-sm">
          ⭐ RECOMENDADO
        </div>
      )}

      <div className="p-6 md:p-8">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: '#1e3a2b' }}>
          <Zap className="w-6 h-6" style={{ color: '#ff5c36' }} />
          {title}
        </h3>

        <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-8 mb-6 overflow-hidden border-2 border-green-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-200 rounded-full blur-3xl opacity-30"></div>

          <div className="relative">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="w-6 h-6 text-green-600" />
              <h4 className="text-lg font-bold text-slate-900 ml-2">Tu Ahorro Transformacional</h4>
            </div>

            <div className="flex items-center justify-center gap-6 mb-6 flex-wrap">
              <div className="text-center">
                <div className="text-sm font-semibold text-slate-600 mb-1">PAGAS AHORA</div>
                <div className="text-4xl font-black text-red-600 line-through">{formatCurrency(financial.pagoAhora)}</div>
                <div className="text-xs text-slate-500 mt-1">cada bimestre</div>
              </div>
              <div className="text-5xl font-black" style={{ color: '#3cd070' }}>→</div>
              <div className="text-center">
                <div className="text-sm font-semibold text-slate-600 mb-1">PAGARÁS</div>
                <div className="text-4xl font-black" style={{ color: '#3cd070' }}>{formatCurrency(financial.pagoFuturo)}</div>
                <div className="text-xs text-slate-500 mt-1">cada bimestre</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-5 text-center border-2 border-green-300">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" style={{ color: '#ff5c36' }} />
                <p className="text-sm font-bold text-slate-600">AHORRO BIMESTRAL</p>
                <Sparkles className="w-5 h-5" style={{ color: '#ff5c36' }} />
              </div>
              <p className="text-5xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {formatCurrency(financial.ahorroBimestral)}
              </p>
            </div>
          </div>
        </div>

        {showDACWarning && dacBimonthlyPayment && dacFinancial && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-6 shadow-lg">
            <p className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
              <span className="text-xl">⚠️</span> Advertencia DAC
            </p>
            <p className="text-sm text-amber-800 mb-2">
              Tu consumo de <strong>{Math.round(data.input.consumoKwh || 0)} kWh</strong> bimestrales te hace candidato para tarifa DAC.
              Si caes en DAC, tu pago sería de <strong>{formatCurrency(dacBimonthlyPayment)}</strong> al bimestre.
            </p>
            <p className="text-sm text-amber-800">
              Con paneles solares en DAC: pagarías <strong>{formatCurrency(dacFinancial.pagoFuturo)}</strong> y ahorrarías <strong>{formatCurrency(dacFinancial.ahorroBimestral)}</strong> al bimestre.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#ff5c36' }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Tu Sistema Solar</h5>
            </div>
            <p className="text-3xl font-black mb-2" style={{ color: '#ff5c36' }}>{(system.potenciaTotal / 1000).toFixed(1)} kWp</p>
            <div className="space-y-1">
              <p className="text-sm text-slate-700"><strong>{system.numPaneles}</strong> paneles solares</p>
              <p className="text-sm text-slate-700"><strong>{Math.round(system.generacionMensualKwh)}</strong> kWh/mes</p>
              <p className="text-sm text-slate-700"><strong>{porcentajeCobertura.toFixed(0)}%</strong> cobertura</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h5 className="text-sm font-bold text-slate-700">Retorno de Inversión</h5>
            </div>
            <p className="text-3xl font-black text-blue-600 mb-2">{financial.anosRetorno.toFixed(1)} años</p>
            <div className="space-y-1">
              <p className="text-sm text-slate-700">Ahorro en 25 años:</p>
              <p className="text-xl font-black text-slate-900">{formatCurrency(financial.ahorroBimestral * 6 * 25)}</p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-slate-200 pt-6 mb-6">
          <h4 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <span className="text-white text-lg">💰</span>
            </div>
            Tu Inversión
          </h4>
          <div className="bg-slate-50 rounded-2xl p-6 space-y-3 border-2 border-slate-200">
            <div className="flex justify-between text-slate-700 text-lg">
              <span>Precio de lista:</span>
              <span className="font-semibold">{formatCurrency(financial.precioLista)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold" style={{ color: '#3cd070' }}>
              <span>Descuento (10%):</span>
              <span>-{formatCurrency(financial.descuento)}</span>
            </div>
            <div className="flex justify-between text-slate-700 text-lg border-t-2 pt-3">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(financial.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-700 text-lg">
              <span>IVA:</span>
              <span className="font-semibold">{formatCurrency(financial.iva)}</span>
            </div>
            <div className="flex justify-between text-2xl font-black pt-3 border-t-2" style={{ color: '#1e3a2b' }}>
              <span>INVERSIÓN TOTAL</span>
              <span>{formatCurrency(financial.total)}</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-2xl p-5 mt-4 shadow-lg">
            <p className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Pago en 2 exhibiciones:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-slate-600 mb-1">Anticipo 50%</p>
                <p className="text-2xl font-black text-blue-900">{formatCurrency(financial.anticipo)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-slate-600 mb-1">Pago final 50%</p>
                <p className="text-2xl font-black text-blue-900">{formatCurrency(financial.pagoPostInterconexion)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-slate-200 pt-6 mb-6">
          <h4 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
            <TreePine className="w-6 h-6 text-green-600" />
            Impacto Ambiental
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-4 shadow-lg">
              <div className="text-4xl mb-2">🌳</div>
              <p className="text-3xl font-black text-green-700">{environmental.arboles}</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">árboles/año</p>
            </div>
            <div className="text-center bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 shadow-lg">
              <div className="text-4xl mb-2">🛢️</div>
              <p className="text-3xl font-black text-amber-700">{environmental.barrilesPetroleo}</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">barriles evitados/año</p>
            </div>
            <div className="text-center bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-300 rounded-2xl p-4 shadow-lg">
              <div className="text-4xl mb-2">☁️</div>
              <p className="text-3xl font-black text-sky-700">{environmental.toneladasCO2}</p>
              <p className="text-xs text-slate-600 font-semibold mt-1">ton CO₂/año</p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-slate-200 pt-6">
          <h4 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Shield className="w-6 h-6 text-slate-700" />
            Componentes del Sistema
          </h4>
          <div className="space-y-3">
            {components.map((comp, idx) => (
              <div key={idx} className="flex justify-between items-center bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
                <div>
                  <p className="font-bold text-slate-900">{comp.concepto}</p>
                  <p className="text-sm text-slate-600 mt-1">{comp.marca} · {comp.modelo}</p>
                </div>
                <div className="text-right bg-white rounded-lg px-4 py-2 border-2 border-slate-300">
                  <p className="text-2xl font-black" style={{ color: '#ff5c36' }}>×{comp.cantidad}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-slate-300 rounded-2xl p-5 shadow-lg">
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Nota importante:</strong> Esta es una cotización preliminar basada en la información proporcionada.
            El precio final se ajustará tras la visita técnica gratuita donde validaremos las condiciones específicas de tu techo, orientación y otros factores técnicos.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Proposal({ proposal, onClose }: ProposalProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 py-8 px-4 relative">
      <button
        onClick={onClose}
        className="fixed top-6 right-6 z-50 w-12 h-12 bg-white rounded-full shadow-xl border-2 border-slate-300 flex items-center justify-center hover:bg-slate-100 transition-all hover:scale-110"
      >
        <X className="w-6 h-6 text-slate-700" />
      </button>

      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 text-white rounded-3xl shadow-2xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-10"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-300 rounded-full blur-3xl opacity-10"></div>

          <div className="relative flex justify-between items-center flex-wrap gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <Zap className="w-8 h-8" style={{ color: '#ff5c36' }} />
                </div>
                <h1 className="text-5xl font-black">SolarYa</h1>
              </div>
              <p className="text-green-100 text-xl font-semibold">Tu solución solar personalizada</p>
            </div>
            <div className="text-right bg-white/10 backdrop-blur-sm rounded-2xl p-5 border-2 border-white/20">
              <p className="text-3xl font-black mb-1">¡Propuesta Lista! 🎉</p>
              <p className="text-green-100 font-semibold">{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {proposal.future ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ProposalCard data={proposal.current} title="Consumo Actual" />
            <ProposalCard data={proposal.future} title="Con Cargas Futuras" isPrimary />
          </div>
        ) : (
          <ProposalCard data={proposal.current} title="Tu Propuesta Solar" isPrimary />
        )}

        <div className="mt-8 bg-white rounded-3xl shadow-2xl border-2 border-slate-200 p-8 md:p-10">
          <h3 className="text-3xl font-black mb-6 flex items-center gap-3" style={{ color: '#1e3a2b' }}>
            <span className="text-4xl">❓</span>
            Preguntas Frecuentes
          </h3>

          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg">
              <h4 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                ¿Qué incluye exactamente el sistema?
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>TODO INCLUIDO:</strong> Paneles de última generación, inversores/microinversores, estructura de montaje profesional,
                cableado especializado, protecciones eléctricas, instalación por técnicos certificados, trámites completos ante CFE,
                app de monitoreo en tiempo real, y todas las garantías respaldadas.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
              <h4 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                ¿Cuánto tiempo dura la instalación?
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Instalación física:</strong> 5 días laborales (1 semana).
                <br />
                <strong>Trámites CFE:</strong> 2-4 semanas adicionales.
                <br />
                <strong>Tiempo total:</strong> 4-6 semanas desde la visita técnica hasta que empiezas a generar energía.
              </p>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
              <h4 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                ¿Qué garantías tengo?
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>✓ 2 años</strong> garantía total de instalación y mano de obra
                <br />
                <strong>✓ 12 años</strong> garantía en equipos (inversores y accesorios)
                <br />
                <strong>✓ 25 años</strong> garantía de generación de energía en paneles solares
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 text-white rounded-3xl shadow-2xl p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full blur-3xl opacity-10"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-300 rounded-full blur-3xl opacity-10"></div>

          <div className="relative">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-4xl font-black mb-3">¿Listo para comenzar?</h3>
            <p className="text-green-100 text-lg mb-8 max-w-2xl mx-auto">
              Nuestro equipo de expertos está listo para agendar tu visita técnica gratuita y comenzar tu transformación energética
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={onClose}
                className="px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl"
                style={{ background: '#ff5c36', color: 'white' }}
              >
                Agendar visita técnica gratuita
              </button>
              <button
                onClick={onClose}
                className="px-8 py-4 bg-white text-green-800 rounded-2xl font-bold text-lg hover:bg-green-50 transition-all transform hover:scale-105 shadow-xl"
              >
                Tengo preguntas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
