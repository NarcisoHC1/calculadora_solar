import { ProposalData, DualProposal } from './types';

interface ProposalProps {
  proposal: DualProposal;
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

function ProposalCard({ data, title }: { data: ProposalData; title: string }) {
  const { system, financial, environmental, components, porcentajeCobertura, showDACWarning, dacBimonthlyPayment, dacFinancial } = data;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
      <h3 className="text-2xl font-bold mb-6" style={{ color: '#1e3a2b' }}>{title}</h3>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
        <h4 className="text-lg font-bold text-slate-900 mb-4">Tu Ahorro Transformacional</h4>
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 line-through">{formatCurrency(financial.pagoAhora)}</div>
            <div className="text-sm text-slate-600">ANTES</div>
          </div>
          <div className="text-3xl" style={{ color: '#3cd070' }}>→</div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: '#3cd070' }}>{formatCurrency(financial.pagoFuturo)}</div>
            <div className="text-sm text-slate-600">DESPUÉS</div>
          </div>
        </div>
        <div className="bg-white border border-green-300 rounded-lg p-3 text-center">
          <p className="text-lg font-bold" style={{ color: '#1e3a2b' }}>
            ¡Ahorras {formatCurrency(financial.ahorroBimestral)} cada bimestre!
          </p>
        </div>
      </div>

      {showDACWarning && dacBimonthlyPayment && dacFinancial && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ Advertencia DAC</p>
          <p className="text-sm text-amber-800 mb-2">
            Tu consumo de {Math.round(data.input.consumoKwh || 0)} kWh bimestrales te hace candidato para DAC.
            Si caes en DAC, tu pago sería de {formatCurrency(dacBimonthlyPayment)} al bimestre.
          </p>
          <p className="text-sm text-amber-800">
            Con paneles solares en DAC: pagarías {formatCurrency(dacFinancial.pagoFuturo)} y ahorrarías {formatCurrency(dacFinancial.ahorroBimestral)} al bimestre.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h5 className="text-sm font-semibold text-slate-700 mb-2">Tu Sistema Solar</h5>
          <p className="text-2xl font-bold mb-1" style={{ color: '#ff5c36' }}>{(system.potenciaTotal / 1000).toFixed(1)} kWp</p>
          <p className="text-sm text-slate-600">Número de paneles: <strong>{system.numPaneles}</strong></p>
          <p className="text-sm text-slate-600">Generación mensual: <strong>{Math.round(system.generacionMensualKwh)} kWh</strong></p>
          <p className="text-sm text-slate-600">Cobertura: <strong>{porcentajeCobertura.toFixed(0)}%</strong></p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h5 className="text-sm font-semibold text-slate-700 mb-2">Recuperación de Inversión</h5>
          <p className="text-2xl font-bold mb-1" style={{ color: '#ff5c36' }}>{financial.anosRetorno.toFixed(1)} años</p>
          <p className="text-sm text-slate-600">Ahorro en 25 años:</p>
          <p className="text-lg font-bold" style={{ color: '#1e3a2b' }}>{formatCurrency(financial.ahorroBimestral * 6 * 25)}</p>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6 mb-6">
        <h4 className="text-lg font-bold text-slate-900 mb-4">Tu Inversión</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-slate-700">
            <span>Precio de lista:</span>
            <span>{formatCurrency(financial.precioLista)}</span>
          </div>
          <div className="flex justify-between" style={{ color: '#3cd070' }}>
            <span>Descuento (10%):</span>
            <span>-{formatCurrency(financial.descuento)}</span>
          </div>
          <div className="flex justify-between text-slate-700 border-t pt-2">
            <span>Subtotal:</span>
            <span>{formatCurrency(financial.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>IVA:</span>
            <span>{formatCurrency(financial.iva)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-2 border-t" style={{ color: '#1e3a2b' }}>
            <span>INVERSIÓN TOTAL</span>
            <span>{formatCurrency(financial.total)}</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">Pago en 2 exhibiciones:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><strong>Anticipo (50%):</strong> {formatCurrency(financial.anticipo)}</li>
            <li><strong>Pago final (50%):</strong> {formatCurrency(financial.pagoPostInterconexion)}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6 mb-6">
        <h4 className="text-lg font-bold text-slate-900 mb-4">Impacto Ambiental</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-2xl font-bold" style={{ color: '#3cd070' }}>{environmental.arboles}</p>
            <p className="text-xs text-slate-600">árboles plantados/año</p>
          </div>
          <div className="text-center bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-2xl font-bold" style={{ color: '#3cd070' }}>{environmental.barrilesPetroleo}</p>
            <p className="text-xs text-slate-600">barriles petróleo evitados/año</p>
          </div>
          <div className="text-center bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-2xl font-bold" style={{ color: '#3cd070' }}>{environmental.toneladasCO2}</p>
            <p className="text-xs text-slate-600">toneladas CO₂/año</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h4 className="text-lg font-bold text-slate-900 mb-4">Componentes del Sistema</h4>
        <div className="space-y-3">
          {components.map((comp, idx) => (
            <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div>
                <p className="font-semibold text-slate-900">{comp.concepto}</p>
                <p className="text-sm text-slate-600">{comp.marca} - {comp.modelo}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">x{comp.cantidad}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs text-slate-600">
          <strong>Nota:</strong> Esta es una cotización preliminar basada en tu información. El precio final se ajustará tras la visita técnica gratuita donde validaremos las condiciones específicas de tu techo y orientación.
        </p>
      </div>
    </div>
  );
}

export default function Proposal({ proposal, userName }: ProposalProps) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-green-800 to-green-600 text-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-extrabold mb-2">SolarYa</h1>
              <p className="text-green-100 text-lg">Tu solución solar personalizada</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">Estimado {userName}</p>
              <p className="text-green-100">Propuesta Personalizada</p>
              <p className="text-green-100">{new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {proposal.future ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProposalCard data={proposal.current} title="Propuesta para Consumo Actual" />
            <ProposalCard data={proposal.future} title="Propuesta con Cargas Futuras" />
          </div>
        ) : (
          <ProposalCard data={proposal.current} title="Tu Propuesta Solar" />
        )}

        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
          <h3 className="text-2xl font-bold mb-4" style={{ color: '#1e3a2b' }}>Preguntas Frecuentes</h3>

          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-4">
              <h4 className="font-semibold text-slate-900 mb-2">¿Qué incluye exactamente el sistema?</h4>
              <p className="text-sm text-slate-700">
                INCLUYE: Paneles, inversores/microinversores, estructura de montaje, cableado, protecciones eléctricas,
                instalación profesional, trámites CFE, app de monitoreo, todas las garantías.
              </p>
            </div>

            <div className="border-b border-slate-200 pb-4">
              <h4 className="font-semibold text-slate-900 mb-2">¿Cuánto tiempo dura la instalación?</h4>
              <p className="text-sm text-slate-700">
                La instalación física toma 5 días (1 semana). Los trámites con CFE toman 2-4 semanas adicionales.
                Tiempo total estimado: 4-6 semanas desde la visita hasta interconexión completa.
              </p>
            </div>

            <div className="border-b border-slate-200 pb-4">
              <h4 className="font-semibold text-slate-900 mb-2">¿Qué garantías tengo?</h4>
              <p className="text-sm text-slate-700">
                2 años garantía de instalación, 12 años garantía en equipos, 25 años garantía de generación de energía.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-green-800 to-green-600 text-white rounded-2xl shadow-xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">¿Listo para comenzar?</h3>
          <p className="text-green-100 mb-6">Nuestro equipo está listo para agendar tu visita técnica gratuita</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="#"
              className="px-6 py-3 rounded-xl font-semibold transition-all"
              style={{ background: '#ff5c36', color: 'white' }}
            >
              Agendar visita técnica
            </a>
            <a
              href="#"
              className="px-6 py-3 bg-white text-green-800 rounded-xl font-semibold hover:bg-green-50 transition-all"
            >
              Tengo preguntas
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
