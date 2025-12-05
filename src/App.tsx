import { useState, useEffect, useRef } from 'react';
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Lock, Loader2 } from 'lucide-react';
import { getEstadosUnique, getMinStateThreshold, getMaxStateThreshold, isCDMXorMexico } from './stateThresholds';
import { generateProposal } from './calculationEngine';
import type { Proposal, ComponentBreakdown, ProposalData } from './types';
import ProposalComponent from './Proposal';

const HOUSE_MEMBER_OPTIONS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  'Más de 15'
];

const BUSINESS_RANGE_OPTIONS = ['1-10', '11-50', '51-250', '251 o más'];

type Step = 1 | 2 | 3;

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
const OCR_ENDPOINT_OVERRIDE = (import.meta as any).env?.VITE_OCR_ENDPOINT || '';
const DEFAULT_OCR_ENDPOINT = 'https://solarya-ocr-service-production.up.railway.app/v1/ocr/cfe';

function resolveOcrEndpoint(override?: string): string {
  const direct = (override || '').replace(/\/+$/, '');
  if (direct) return direct;
  return DEFAULT_OCR_ENDPOINT;
}

type FrontendBlock = {
  con_solarya_pagaras?: number | null;
  ahorras_cada_bimestre?: number | null;
  no_y_tamano_paneles?: { cantidad?: number | null; potencia_w?: number | null } | null;
  energia_generada?: number | null;
  generas_el_x_porcentaje_consumo?: number | null;
  ahorro_en_25_anos?: number | null;
  retorno_de_inversion?: number | null;
  pagos_en_exhibiciones?: number[] | null;
  precio_de_lista?: number | null;
  descuento?: number | null;
  subtotal?: number | null;
  iva?: number | null;
  inversion_total?: number | null;
  alerta_dac?: number | null;
  pago_dac_hipotetico_consumo_actual?: number | null;
  pago_dac_hipotetico_cargas_extra?: number | null;
  impacto_ambiental?: { carbon?: number | null; trees?: number | null; oil?: number | null } | null;
};

type BackendProposalEnvelope = {
  propuesta_actual?: any;
  propuesta_cargas_extra?: any;
  frontend_outputs?: { base?: FrontendBlock | null; cargas_extra?: FrontendBlock | null } | null;
  tarifa?: string;
  periodicidad?: string;
  limite_dac_mensual_kwh?: number | null;
  kwh_consumidos?: number | null;
  kwh_consumidos_y_cargas_extra?: number | null;
};

function pickValue<T>(...values: (T | null | undefined | '')[]): T | undefined {
  const found = values.find(v => v !== undefined && v !== null && v !== '');
  return found === '' ? undefined : (found as T | undefined);
}

function mergeParams(...sources: any[]): Record<string, any> {
  const target: Record<string, any> = {};

  const toObject = (value: any): Record<string, any> | undefined => {
    if (!value) return undefined;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const addEntries = (source?: any) => {
    if (Array.isArray(source)) {
      source.forEach(addEntries);
      return;
    }
    const obj = toObject(source);
    if (!obj) return;
    const candidates = [
      obj,
      obj.params,
      obj.Params,
      obj.fields?.Params,
      obj.fields?.params,
      obj.fields,
      obj.params?.Params,
      obj.params?.params
    ];
    candidates.forEach(candidate => {
      const candObj = toObject(candidate);
      if (!candObj) return;
      Object.entries(candObj).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          target[key] = value;
        }
      });
    });
  };

  sources.forEach(addEntries);
  return target;
}

function pickFromParams<T>(params: any, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (params && Object.prototype.hasOwnProperty.call(params, key)) {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        return value as T;
      }
    }
    const lowerKey = key.toLowerCase();
    const matchedEntry = params
      ? Object.entries(params).find(([entryKey]) => entryKey.toLowerCase() === lowerKey)
      : undefined;
    if (matchedEntry && matchedEntry[1] !== undefined && matchedEntry[1] !== null && matchedEntry[1] !== '') {
      return matchedEntry[1] as T;
    }
  }
  return undefined;
}

function buildComponentsFromBackend(propuesta: any, potenciaPorPanel: number, cantidadPaneles: number): ComponentBreakdown[] {
  if (!propuesta) return [];

  const components: ComponentBreakdown[] = [];

  const panelParams = mergeParams(
    propuesta?.panel_specs_params,
    propuesta?.panel_specs?.params,
    propuesta?.panel_specs?.Params,
    propuesta?.panel_specs
  );
  const microParams = mergeParams(
    propuesta?.microinverter_specs_params,
    propuesta?.microinverter_specs?.params,
    propuesta?.microinverter_specs?.Params,
    propuesta?.microinverter_specs
  );
  const inverterParams = mergeParams(
    propuesta?.inverter_specs_params,
    propuesta?.inverter_specs?.params,
    propuesta?.inverter_specs?.Params,
    propuesta?.inverter_specs
  );
  const montajeParams = mergeParams(
    propuesta?.montaje_specs_params,
    propuesta?.montaje_specs?.params,
    propuesta?.montaje_specs?.Params,
    propuesta?.montaje_specs
  );

  if (cantidadPaneles > 0) {
    const panelWarranty = pickValue(
      propuesta?.panel_product_warranty_years,
      propuesta?.panel_specs_product_warranty_years,
      propuesta?.panel_specs_params_product_warranty_years,
      propuesta?.product_warranty_years_panel_specs_params,
      propuesta?.product_warranty_years,
      pickFromParams(panelParams, 'product_warranty_years', 'Product_Warranty_Years')
    );
    const generationWarranty = pickValue(
      propuesta?.panel_generation_warranty_years,
      propuesta?.panel_specs_generation_warranty_years,
      propuesta?.panel_specs_params_generation_warranty_years,
      propuesta?.generation_warranty_years_panel_specs_params,
      propuesta?.generation_warranty_years,
      pickFromParams(panelParams, 'generation_warranty_years', 'Generation_Warranty_Years')
    );
    const measurementsM2 = pickValue(
      propuesta?.panel_measurements_m2,
      propuesta?.panel_specs_measurements_m2,
      propuesta?.panel_specs_params_measurements_m2,
      propuesta?.measurements_m2_panel_specs_params,
      propuesta?.measurements_m2,
      pickFromParams(panelParams, 'measurements_m2', 'Measurements_M2')
    );
    const capacityW = potenciaPorPanel || propuesta?.potencia_panel || 0;
    const panelBrand = pickValue(
      propuesta?.panel_brand,
      propuesta?.panel_specs_brand,
      propuesta?.panel_specs_params_brand,
      propuesta?.brand_panel_specs_params,
      pickFromParams(panelParams, 'brand', 'Brand')
    );
    const panelModel =
      pickValue(
        propuesta?.panel_model,
        propuesta?.panel_specs_model,
        propuesta?.panel_specs_params_model,
        propuesta?.model_panel_specs_params,
        pickFromParams(panelParams, 'model', 'Model')
      );
    components.push({
      concepto: 'Paneles solares',
      cantidad: cantidadPaneles,
      marca: panelBrand || '',
      modelo: panelModel || '',
      type: 'panel',
      productWarrantyYears: panelWarranty,
      generationWarrantyYears: generationWarranty,
      capacityWatts: capacityW,
      measurementsM2: measurementsM2 != null ? Number(measurementsM2) : undefined
    });
  }

  if (propuesta.micro_central === 'central' && propuesta.id_inversor) {
    const inverterBrand =
      pickValue(
        propuesta?.inversor_brand,
        propuesta?.inverter_specs_brand,
        propuesta?.inverter_specs_params_brand,
        propuesta?.brand_inverter_specs_params,
        pickFromParams(inverterParams, 'brand', 'Brand')
      );
    const inverterModel =
      pickValue(
        propuesta?.inversor_model,
        propuesta?.inverter_specs_model,
        propuesta?.inverter_specs_params_model,
        propuesta?.model_inverter_specs_params,
        pickFromParams(inverterParams, 'model', 'Model')
      );
    components.push({
      concepto: 'Inversor',
      cantidad: 1,
      marca: inverterBrand || '',
      modelo: inverterModel || '',
      type: 'inverter',
      capacityKw: pickValue(
        propuesta?.capacity_kw_inverter_specs_params,
        propuesta?.potencia_inversor_kw,
        propuesta?.capacity_kw,
        pickFromParams(inverterParams, 'capacity_kw', 'Capacity_kW')
      ),
      productWarrantyYears: pickValue(
        propuesta?.inversor_product_warranty_years,
        propuesta?.inverter_specs_product_warranty_years,
        propuesta?.inverter_specs_params_product_warranty_years,
        propuesta?.product_warranty_years_inverter_specs_params,
        pickFromParams(inverterParams, 'product_warranty_years', 'Product_Warranty_Years')
      )
    });
  } else {
    if (propuesta.id_micro_4_panel && propuesta.cantidad_micro_4_panel) {
      const microBrand4 =
        pickValue(
          propuesta?.microinverter_brand_4_panel,
          propuesta?.micro_brand_4_panel,
          propuesta?.microinverter_specs_brand,
          propuesta?.microinverter_specs_params_brand,
          propuesta?.brand_microinverter_specs_params,
          pickFromParams(microParams, 'brand', 'Brand')
        );
      const microModel4 =
        pickValue(
          propuesta?.microinverter_model_4_panel,
          propuesta?.micro_model_4_panel,
          propuesta?.microinverter_specs_model,
          propuesta?.microinverter_specs_params_model,
          propuesta?.model_microinverter_specs_params,
          pickFromParams(microParams, 'model', 'Model')
      );
      components.push({
        concepto: 'Microinversor 4 paneles',
        cantidad: propuesta.cantidad_micro_4_panel,
        marca: microBrand4 || '',
        modelo: microModel4 || '',
        type: 'microinverter',
        productWarrantyYears: pickValue(
          propuesta?.micro_product_warranty_years,
          propuesta?.microinverter_specs_product_warranty_years,
          propuesta?.microinverter_specs_params_product_warranty_years,
          propuesta?.product_warranty_years_microinverter_specs_params,
          pickFromParams(
            microParams,
            'product_warranty_years',
            'Product_Warranty_Years',
            'Product Warranty_Years'
          )
        )
      });
    }
    if (propuesta.id_micro_2_panel && propuesta.cantidad_micro_2_panel) {
      const microBrand2 =
        pickValue(
          propuesta?.microinverter_brand_2_panel,
          propuesta?.micro_brand_2_panel,
          propuesta?.microinverter_specs_brand,
          propuesta?.microinverter_specs_params_brand,
          propuesta?.brand_microinverter_specs_params,
          pickFromParams(microParams, 'brand', 'Brand')
        );
      const microModel2 =
        pickValue(
          propuesta?.microinverter_model_2_panel,
          propuesta?.micro_model_2_panel,
          propuesta?.microinverter_specs_model,
          propuesta?.microinverter_specs_params_model,
          propuesta?.model_microinverter_specs_params,
          pickFromParams(microParams, 'model', 'Model')
      );
      components.push({
        concepto: 'Microinversor 2 paneles',
        cantidad: propuesta.cantidad_micro_2_panel,
        marca: microBrand2 || '',
        modelo: microModel2 || '',
        type: 'microinverter',
        productWarrantyYears: pickValue(
          propuesta?.micro_product_warranty_years,
          propuesta?.microinverter_specs_product_warranty_years,
          propuesta?.microinverter_specs_params_product_warranty_years,
          propuesta?.product_warranty_years_microinverter_specs_params,
          pickFromParams(
            microParams,
            'product_warranty_years',
            'Product_Warranty_Years',
            'Product Warranty_Years'
          )
        )
      });
    }
  }

  if (propuesta.id_montaje_a && propuesta.cantidad_montaje_a) {
    const montajeBrandA =
      pickValue(
        propuesta?.montaje_brand_a,
        propuesta?.montaje_specs_brand,
        propuesta?.montaje_specs_params_brand,
        propuesta?.brand_montaje_specs_params,
        pickFromParams(montajeParams, 'brand', 'Brand')
      );
    const montajeModelA =
      pickValue(
        propuesta?.montaje_model_a,
        propuesta?.montaje_specs_model,
        propuesta?.montaje_specs_params_model,
        propuesta?.model_montaje_specs_params,
        pickFromParams(montajeParams, 'model', 'Model')
      );
    components.push({
      concepto: 'Montaje A',
      cantidad: propuesta.cantidad_montaje_a,
      marca: montajeBrandA || '',
      modelo: montajeModelA || '',
      type: 'montaje',
      productWarrantyYears: pickValue(
        propuesta?.montaje_product_warranty_years,
        propuesta?.montaje_specs_product_warranty_years,
        propuesta?.montaje_specs_params_product_warranty_years,
        propuesta?.product_warranty_years_montaje_specs_params,
        pickFromParams(montajeParams, 'product_warranty_years', 'Product_Warranty_Years')
      )
    });
  }

  if (propuesta.id_montaje_b && propuesta.cantidad_montaje_b) {
    const montajeBrandB =
      pickValue(
        propuesta?.montaje_brand_b,
        propuesta?.montaje_specs_brand,
        propuesta?.montaje_specs_params_brand,
        propuesta?.brand_montaje_specs_params,
        pickFromParams(montajeParams, 'brand', 'Brand')
      );
    const montajeModelB =
      pickValue(
        propuesta?.montaje_model_b,
        propuesta?.montaje_specs_model,
        propuesta?.montaje_specs_params_model,
        propuesta?.model_montaje_specs_params,
        pickFromParams(montajeParams, 'model', 'Model')
      );
    components.push({
      concepto: 'Montaje B',
      cantidad: propuesta.cantidad_montaje_b,
      marca: montajeBrandB || '',
      modelo: montajeModelB || '',
      type: 'montaje',
      productWarrantyYears: pickValue(
        propuesta?.montaje_product_warranty_years,
        propuesta?.montaje_specs_product_warranty_years,
        propuesta?.montaje_specs_params_product_warranty_years,
        propuesta?.product_warranty_years_montaje_specs_params,
        pickFromParams(montajeParams, 'product_warranty_years', 'Product_Warranty_Years')
      )
    });
  }

  if (!propuesta.id_montaje_a && !propuesta.id_montaje_b && propuesta.id_montaje) {
    const montajeBrand =
      pickValue(
        propuesta?.montaje_brand,
        propuesta?.montaje_specs_brand,
        propuesta?.montaje_specs_params_brand,
        propuesta?.brand_montaje_specs_params,
        pickFromParams(montajeParams, 'brand', 'Brand')
      );
    const montajeModel =
      pickValue(
        propuesta?.montaje_model,
        propuesta?.montaje_specs_model,
        propuesta?.montaje_specs_params_model,
        propuesta?.model_montaje_specs_params,
        pickFromParams(montajeParams, 'model', 'Model')
      );
    components.push({
      concepto: 'Montaje',
      cantidad: 1,
      marca: montajeBrand || '',
      modelo: montajeModel || '',
      type: 'montaje',
      productWarrantyYears: pickValue(
        propuesta?.montaje_product_warranty_years,
        propuesta?.montaje_specs_product_warranty_years,
        propuesta?.montaje_specs_params_product_warranty_years,
        propuesta?.product_warranty_years_montaje_specs_params,
        pickFromParams(montajeParams, 'product_warranty_years', 'Product_Warranty_Years')
      )
    });
  }

  return components;
}

function blockToProposalData(
  block: FrontendBlock | null | undefined,
  propuesta: any,
  periodicidad: string,
  tarifa: string,
  consumoKwhPeriodo?: number | null,
  limiteDACMensual?: number | null
): ProposalData | null {
  if (!block || !propuesta) return null;

  const energiaPeriodo = Number(block.energia_generada || 0);
  const generacionMensualKwh = periodicidad === 'bimestral' ? energiaPeriodo / 2 : energiaPeriodo;
  const cantidadPaneles = Number(propuesta.cantidad_paneles || block.no_y_tamano_paneles?.cantidad || 0);
  const potenciaPorPanel = Number(propuesta.potencia_panel || block.no_y_tamano_paneles?.potencia_w || 0) as any;
  const potenciaTotal = cantidadPaneles * potenciaPorPanel;

  const pagoFuturo = Number(block.con_solarya_pagaras || 0);
  const ahorroBimestral = Number(block.ahorras_cada_bimestre || 0);
  const pagoAhora = pagoFuturo + ahorroBimestral;
  const total = Number(block.inversion_total ?? propuesta.total ?? 0);

  const secuencia = (propuesta.secuencia_exhibiciones || '').split(',').map(v => Number(v.trim())).filter(v => !Number.isNaN(v) && v > 0);
  const pagosEnExhibiciones = (block.pagos_en_exhibiciones && block.pagos_en_exhibiciones.length > 0)
    ? block.pagos_en_exhibiciones.map(Number)
    : (secuencia.length > 0 ? secuencia.map(v => v * total) : [total * 0.5, total * 0.25, total * 0.25]);
  const descuentoPorcentaje = propuesta.discount_rate ?? null;
  const precioLista = Number(block.precio_de_lista ?? propuesta.precio_lista ?? 0);
  const descuentoCalculado = block.descuento != null
    ? Number(block.descuento)
    : (descuentoPorcentaje != null ? precioLista * descuentoPorcentaje : 0);

  const financial = {
    pagoAhora,
    pagoFuturo,
    ahorroBimestral,
    anosRetorno: Number(block.retorno_de_inversion ?? 0),
    precioLista,
    descuento: descuentoCalculado,
    subtotal: Number(block.subtotal ?? propuesta.subtotal ?? 0),
    iva: Number(block.iva ?? propuesta.iva ?? 0),
    total,
    anticipo: pagosEnExhibiciones[0] ?? total * 0.5,
    pagoPostInterconexion: pagosEnExhibiciones[1] ?? total * 0.5,
    pagosEnExhibiciones,
    secuenciaExhibiciones: secuencia,
    descuentoPorcentaje: descuentoPorcentaje || undefined,
    ahorroEn25: Number(block.ahorro_en_25_anos ?? 0) || undefined
  };
  financial.ahorroEn25 = financial.ahorroEn25 ?? (financial.ahorroBimestral * 6 * 25);

  const porcentajeCobertura = block.generas_el_x_porcentaje_consumo != null
    ? (block.generas_el_x_porcentaje_consumo || 0) * 100
    : 0;

  const impacto = block.impacto_ambiental || propuesta.impacto_ambiental || (propuesta.carbon ? {
    carbon: propuesta.carbon,
    trees: propuesta.trees,
    oil: propuesta.oil
  } : null);

  const environmental = impacto ? {
    arboles: Math.round(impacto.trees ?? 0),
    barrilesPetroleo: Math.round(impacto.oil ?? 0),
    toneladasCO2: Math.round((impacto.carbon ?? 0) * 100) / 100
  } : {
    arboles: Math.round((generacionMensualKwh * 12) / 1500),
    barrilesPetroleo: Math.round((generacionMensualKwh * 12) / 2000),
    toneladasCO2: Math.round((generacionMensualKwh * 12 * 0.0007) * 100) / 100
  };

  const components = buildComponentsFromBackend(propuesta, potenciaPorPanel, cantidadPaneles);

  const dacPaymentRaw = Number(
    block.pago_dac_hipotetico_cargas_extra ??
      block.pago_dac_hipotetico_consumo_actual ??
      block.alerta_dac ??
      0
  );
  const dacBimonthlyPayment = periodicidad === 'mensual' ? dacPaymentRaw * 2 : dacPaymentRaw;
  const consumoPeriodoKwh = Number(consumoKwhPeriodo ?? 0);
  const consumoMensualKwh = periodicidad === 'mensual' ? consumoPeriodoKwh : consumoPeriodoKwh / 2;
  const limiteMensual = limiteDACMensual != null ? Number(limiteDACMensual) : null;
  const isResidentialTariff = /^1[A-F]?$/i.test(tarifa || '');
  const meetsLimit = limiteMensual != null && limiteMensual > 0 ? consumoMensualKwh >= limiteMensual : false;
  const hasDACWarning = isResidentialTariff && dacBimonthlyPayment > 0 && (limiteMensual == null || meetsLimit);

  return {
    input: {
      hasCFE: true,
      plansCFE: false,
      isAislado: false,
      tarifa,
      periodo: periodicidad,
      pagoActual: pagoAhora
    },
    system: {
      numPaneles: cantidadPaneles,
      potenciaPorPanel,
      potenciaTotal,
      generacionMensualKwh,
      generacionAnualKwh: generacionMensualKwh * 12
    },
    financial,
    environmental,
    components,
    porcentajeCobertura,
    showDACWarning: hasDACWarning,
    dacBimonthlyPayment: hasDACWarning ? dacBimonthlyPayment : undefined,
    dacFinancial: hasDACWarning ? financial : undefined
  };
}

function mapBackendToProposal(
  proposal: BackendProposalEnvelope | null | undefined,
  fallbackTarifa: string,
  fallbackPeriodicidad: string
): Proposal | null {
  if (!proposal?.frontend_outputs) return null;

  const periodicidad = proposal.periodicidad || fallbackPeriodicidad || 'bimestral';
  const tarifa = proposal.tarifa || fallbackTarifa || '1';
  const limiteDAC = proposal.limite_dac_mensual_kwh;

  const current = blockToProposalData(
    proposal.frontend_outputs.base,
    proposal.propuesta_actual,
    periodicidad,
    tarifa,
    proposal.kwh_consumidos,
    limiteDAC
  );
  const future = blockToProposalData(
    proposal.frontend_outputs.cargas_extra,
    proposal.propuesta_cargas_extra,
    periodicidad,
    tarifa,
    proposal.kwh_consumidos_y_cargas_extra,
    limiteDAC
  );

  if (!current) return null;

  return { current, future: future || undefined };
}

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Upload
  const [files, setFiles] = useState<File[]>([]);
  const fileUploaded = files.length > 0;
  const [fileNames, setFileNames] = useState<string[]>([]);

  // OCR state
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'extracting' | 'ok' | 'fail'>('idle');
  const [ocrMsg, setOcrMsg] = useState('');
  const [ocrMsgIndex, setOcrMsgIndex] = useState(0);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [ocrQuality, setOcrQuality] = useState<number | null>(null);
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const ocrMsgIntervalRef = useRef<number | null>(null);

  // Step 1 - manual capture toggles and fields
  const [showManual, setShowManual] = useState(false);
  const [hasCFE, setHasCFE] = useState('');
  const [justMoved, setJustMoved] = useState('');
  const [planCFE, setPlanCFE] = useState('');
  const [usoCasaNegocio, setUsoCasaNegocio] = useState('');
  const [numPersonasCasa, setNumPersonasCasa] = useState('');
  const [rangoPersonasNegocio, setRangoPersonasNegocio] = useState('');
  const [pago, setPago] = useState('');
  const [periodo, setPeriodo] = useState('bimestral');
  const [tarifa, setTarifa] = useState('');
  const [knowsTariff, setKnowsTariff] = useState('');
  const [cp, setCP] = useState('');
  const [estado, setEstado] = useState('');
  const [expand, setExpand] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 2 fields
  const [cargas, setCargas] = useState<string[]>([]);
  const [cargaDetalles, setCargaDetalles] = useState<{
    ev?: { modelo: string; km: string };
    minisplit?: { cantidad: string; horas: string };
    secadora?: { horas: string };
  }>({});
  const [tipoInmueble, setTipoInmueble] = useState('');
  const [distanciaTechoTablero, setDistanciaTechoTablero] = useState('');
  const [pisos, setPisos] = useState('');
  const [notas, setNotas] = useState('');

  // Step 3 fields (contact)
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [uso, setUso] = useState('');
  const [privacidad, setPrivacidad] = useState(false);

  // Modals / overlays
  const [showResultModal, setShowResultModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Calculando tu propuesta…');
  const [generatedProposal, setGeneratedProposal] = useState<Proposal | null>(null);

  // Flow flags
  const isNoCFEPlanningFlow = hasCFE === 'no' && (planCFE === 'si' || planCFE === 'aislado');
  const isNoCFENoPlanning = hasCFE === 'no' && planCFE === 'no';
  const shouldAskTariff = !(hasCFE === 'si' && justMoved === 'no');

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

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function compressDataUrl(dataUrl: string, mimeType: string): Promise<string> {
    if (!mimeType.startsWith('image/')) return dataUrl;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1600;
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.65);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // --------- OCR ----------
  const stopOcrMessageLoop = () => {
    if (ocrMsgIntervalRef.current != null) {
      clearInterval(ocrMsgIntervalRef.current);
      ocrMsgIntervalRef.current = null;
    }
    setOcrMsgIndex(0);
  };

  const startOcrMessageLoop = (messages: string[], delay = 1600) => {
    stopOcrMessageLoop();
    if (!messages.length) return;

    let idx = 0;
    let dotIdx = 0;
    setOcrMsg(messages[idx]);
    setOcrMsgIndex(dotIdx);

    if (messages.length === 1) return;

    ocrMsgIntervalRef.current = window.setInterval(() => {
      idx = (idx + 1) % messages.length;
      dotIdx = (dotIdx + 1) % 3;
      setOcrMsg(messages[idx]);
      setOcrMsgIndex(dotIdx);
    }, delay);
  };

  useEffect(() => {
    return () => stopOcrMessageLoop();
  }, []);

  async function runOCR(selectedFiles: File[]) {
    try {
      stopOcrMessageLoop();
      setOcrStatus('uploading');
      startOcrMessageLoop(['Subiendo archivos…', 'Preparando imágenes…']);

      const limitedFiles = selectedFiles.slice(0, 2);
      const firstDataUrl = limitedFiles[0] ? await fileToDataUrl(limitedFiles[0]) : null;
      const compressed = limitedFiles[0] && firstDataUrl
        ? await compressDataUrl(firstDataUrl, limitedFiles[0].type || '')
        : null;

      setOcrStatus('analyzing');
      startOcrMessageLoop([
        'Analizando páginas…',
        'Extrayendo datos de tu recibo…',
        'Interpretando cifras y periodos…'
      ]);

      const primaryEndpoint = resolveOcrEndpoint(OCR_ENDPOINT_OVERRIDE);

      console.log('🛰️ OCR endpoint frontend:', primaryEndpoint);

      const formData = new FormData();
      limitedFiles.forEach(file => formData.append('files', file));

      const callEndpoint = async (url: string) => {
        const resp = await fetch(url, {
          method: 'POST',
          body: formData
        });
        let data: any = null;
        try {
          data = await resp.json();
        } catch (err) {
          data = null;
        }
        return { resp, data };
      };

      const primaryResult = await callEndpoint(primaryEndpoint);
      let response: Response = primaryResult.resp;
      let resultBody: any = primaryResult.data;

      setOcrStatus('extracting');
      startOcrMessageLoop([
        'Recopilando información…',
        'Afinando detalles…',
        'Preparando tu propuesta…'
      ]);

      const result = resultBody ?? (await response.json().catch(() => null));

      if (!response.ok || !result?.ok) {
        const errCode = result?.error || (!response.ok ? `ocr_http_${response.status}` : 'ocr_failed');
        const friendlyMsg = errCode === 'no_images' || errCode === 'no_images_provided' || errCode === 'no_images_converted'
          ? 'No pudimos procesar el archivo. Sube tu recibo como imagen nítida o PDF original.'
          : 'Hubo un error al analizar tu recibo. Sube una imagen más nítida o captura tus datos manualmente.';

        setOcrStatus('fail');
        stopOcrMessageLoop();
        setOcrMsg(friendlyMsg);
        setOcrResult(result || null);
        setOcrQuality(null);
        setOcrImage(null);
        return;
      }

      const normalized = result.data || {};
      const prom = normalized.historicals_promedios || {};

      const tarifaOCR = normalized.Tarifa || normalized.tarifa || result.form_overrides?.tarifa || '';
      const cpOCR = result.form_overrides?.cp || '';
      const periodicidadOCR = normalized.Periodicidad || '';
      const pagoProm = prom.Pago_Prom_MXN_Periodo;
      const estadoOCR = normalized.Estado || '';

      setOcrStatus('ok');
      stopOcrMessageLoop();
      setOcrMsg('¡Listo! Extrajimos correctamente los datos de tu recibo.');
      setOcrResult({ ...result, data: normalized });
      setOcrQuality(typeof result.quality === 'number' ? result.quality : null);
      setOcrImage(compressed || null);

      if (tarifaOCR) setTarifa(tarifaOCR);
      if (cpOCR) setCP(cpOCR);
      if (periodicidadOCR) setPeriodo(periodicidadOCR);
      if (estadoOCR) setEstado(estadoOCR);
      if (pagoProm != null && !Number.isNaN(Number(pagoProm))) setPago(String(Math.round(Number(pagoProm))));

      setHasCFE('si');
      setJustMoved('si');
      setPlanCFE('');
      setShowManual(false);
    } catch (e) {
      console.error('OCR error:', e);
      setOcrStatus('fail');
      stopOcrMessageLoop();
      setOcrMsg('Hubo un error al analizar tu recibo. Sube una imagen más nítida o captura tus datos manualmente.');
      setOcrResult(null);
      setOcrQuality(null);
      setOcrImage(null);
    }
  }

  // --- Upload handler (máx 2) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const next = selected.slice(0, 2);
    setFiles(next);
    setFileNames(next.map(f => f.name));
    await runOCR(next);
  };

  const removeFileAt = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setFileNames(next.map(f => f.name));
    if (next.length === 0) {
      stopOcrMessageLoop();
      setOcrStatus('idle');
      setOcrMsg('');
      setOcrResult(null);
      setOcrQuality(null);
      setOcrImage(null);
    }
  };

  const startManual = () => {
    setShowManual(true);
    setFiles([]);
    setFileNames([]);
    stopOcrMessageLoop();
    setOcrStatus('idle');
    setOcrMsg('');
    setOcrResult(null);
    setOcrQuality(null);
    setOcrImage(null);
  };

  const handleCargaToggle = (carga: string, checked: boolean) => {
    if (carga === 'ninguna') {
      if (checked) {
        setCargas(['ninguna']);
        setCargaDetalles({});
      } else {
        setCargas([]);
      }
      return;
    }

    if (checked) {
      setCargas(prev => [...prev.filter(c => c !== 'ninguna'), carga]);
      if (carga === 'secadora') {
        setCargaDetalles(prev => ({ ...prev, secadora: { horas: '' } }));
      }
    } else {
      setCargas(prev => prev.filter(c => c !== carga));
      setCargaDetalles(prev => {
        const next = { ...prev } as any;
        if (carga === 'ev') delete next.ev;
        if (carga === 'minisplit') delete next.minisplit;
        if (carga === 'secadora') delete next.secadora;
        return next;
      });
    }
  };

  const canProceedStep1 = () => {
    if (fileUploaded) {
      return ocrStatus === 'ok' && !!expand;
    }
    if (!showManual) return false;
    if (!hasCFE) return false;

    if (hasCFE === 'no') {
      if (!planCFE) return false;
      if (planCFE === 'si' || planCFE === 'aislado') {
        if (!usoCasaNegocio) return false;
        if (usoCasaNegocio === 'casa' && !numPersonasCasa) return false;
        if (usoCasaNegocio === 'negocio' && !rangoPersonasNegocio) return false;
        if (!estado) return false;
        if (!expand) return false;
        return true;
      }
      return false;
    }

    if (hasCFE === 'si') {
      if (!justMoved) return false;

      if (justMoved === 'si') {
        if (!pago || Number(pago) <= 0 || !expand) return false;
        if (!knowsTariff) return false;

        if (knowsTariff === 'si') {
          if (!tarifa) return false;
        }

        if (knowsTariff === 'no') {
          if (!usoCasaNegocio) return false;
        }
        // NOTE: No bloqueamos aquí por showError, permitimos avanzar hasta cargas extra
        return true;
      }

      if (justMoved === 'no') {
        if (!usoCasaNegocio) return false;
        if (usoCasaNegocio === 'casa' && !numPersonasCasa) return false;
        if (usoCasaNegocio === 'negocio' && !rangoPersonasNegocio) return false;
        if (!expand) return false;
        return true;
      }
    }
    return false;
  };

  const canProceedStep2 = () => {
    if (cargas.length === 0) return false;
    if (!tipoInmueble) return false;
    if (['2', '4', '5', '8', '9'].includes(tipoInmueble) && !pisos) return false;
    if (['3', '6', '7'].includes(tipoInmueble) && !distanciaTechoTablero) return false;
    if (showError && cargas.includes('ninguna')) return false;

    // Validate carga details
    if (cargas.includes('ev')) {
      if (!cargaDetalles.ev?.modelo || !cargaDetalles.ev?.km) return false;
    }
    if (cargas.includes('minisplit')) {
      if (!cargaDetalles.minisplit?.cantidad || !cargaDetalles.minisplit?.horas) return false;
    }
    if (cargas.includes('secadora')) {
      if (!cargaDetalles.secadora?.horas) return false;
    }

    // Nueva lógica: Si showError (pago bajo threshold) y eligieron "ninguna" → bloquear
    // Si eligieron cargas extra, permitimos avanzar (asumimos que con cargas extra superarán threshold)
    if (showError && cargas.includes('ninguna')) {
      return false;
    }

    return true;
  };

  // Navegación
  const nextStep = () => {
    if (currentStep === 1) {
      // Si eligió subir recibo, avanzamos sólo si OCR OK
      if (fileUploaded) {
        if (ocrStatus === 'ok') setCurrentStep(2);
        return;
      }
      // Para flujo manual, todos van a step 2 para llenar cargas extra
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

  // Validación de WhatsApp (10 dígitos)
  const phoneDigits = telefono.replace(/\D/g, '');
  const phoneValid = phoneDigits.length === 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalUso = usoCasaNegocio
      ? usoCasaNegocio === 'negocio'
        ? 'Negocio'
        : 'Casa'
      : '';

    if (!nombre || !correo || !telefono || !privacidad) return;
    if (!phoneValid) {
      alert('Tu WhatsApp debe tener 10 dígitos (sólo números).');
      return;
    }

    // Calculate bimonthly payment
    const paymentValue = parseFloat(pago || '0');
    const bimestralPayment = periodo === 'bimestral' ? paymentValue : paymentValue * 2;

    // Check conditions for MANUAL flow
    const industrialTariff = ['GDBT', 'GDMTH', 'GDMTO'].includes(tarifa.toUpperCase());
    const isAislado = planCFE === 'aislado';
    const isOutsideCDMXMexico = estado && estado !== 'Ciudad de México' && estado !== 'Estado de México';

    // Check if payment is above max threshold
    const maxThreshold = estado ? getMaxStateThreshold(estado) : 14000;
    const aboveMaxThreshold = bimestralPayment > maxThreshold;

    let flow: 'AUTO' | 'MANUAL' | 'BLOCKED' = 'AUTO';
    let flow_reason = 'ok';
    if (industrialTariff) { flow = 'MANUAL'; flow_reason = 'tariff_business'; }
    else if (isAislado) { flow = 'MANUAL'; flow_reason = 'sistema_aislado'; }
    else if (isOutsideCDMXMexico) { flow = 'MANUAL'; flow_reason = 'outside_service_area'; }
    else if (aboveMaxThreshold) { flow = 'MANUAL'; flow_reason = 'above_max_threshold'; }

    showLoading('Calculando tu propuesta…');

    const loads = {
      ev: cargas.includes('ev') ? cargaDetalles.ev : undefined,
      minisplit: cargas.includes('minisplit') ? cargaDetalles.minisplit : undefined,
      secadora: cargas.includes('secadora') ? cargaDetalles.secadora : undefined,
      bomba: cargas.includes('bomba'),
      otro: cargas.includes('otro')
    };
    const bridge = (window as any).SYBridge;
    const utms = (bridge?.getParentUtms?.() || {}) as any;
    const req_id = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : String(Date.now());

    const expandNormalized = expand
      ? expand
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
      : '';

    const formPayload: any = {
      nombre,
      email: correo,
      telefono,
      uso: finalUso,
      periodicidad: periodo || 'bimestral',
      pago_promedio_mxn: parseFloat(pago || '0') || 0,
      cp,
      estado: estado || ocrResult?.data?.Estado || '',
      municipio: estado || ocrResult?.data?.Estado || '',
      tarifa: tarifa || (ocrResult?.data?.Tarifa || ocrResult?.data?.tarifa || ocrResult?.form_overrides?.tarifa || ''),
      kwh_consumidos:
        ocrResult?.data?.historicals_promedios?.kWh_consumidos ||
        ocrResult?.data?.kWh_consumidos ||
        null,
      tipo_inmueble: tipoInmueble || '',
      pisos: parseInt(pisos || '0', 10) || 0,
      distancia_techo_tablero: parseInt(distanciaTechoTablero || '0', 10) || 0,
      numero_personas: usoCasaNegocio === 'casa' ? numPersonasCasa : '',
      rango_personas_negocio: usoCasaNegocio === 'negocio' ? rangoPersonasNegocio : '',
      notes: notas || '',
      loads,
      has_cfe: hasCFE === 'si' ? true : hasCFE === 'no' ? false : undefined,
      tiene_recibo: hasCFE === 'si' ? (justMoved === 'si' || ocrResult?.ok === true) : false,
      plans_cfe: planCFE,
      ya_tiene_fv: expandNormalized ? expandNormalized === 'si' : undefined,
      propuesta_auto: flow === 'AUTO',
      ocr_result: ocrResult,
      ocr_image: ocrImage
    };

    try {
      const bridge = (window as any).SYBridge;

      console.log('📤 Enviando datos al backend...');

      const submissionPayload = { form: formPayload, ocr: ocrResult || null };

      const response = await fetch('/api/cotizacion_v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload)
      });

      console.log('📥 Respuesta recibida:', response.status);

      const result = await response.json();
      console.log('📋 Resultado:', result);

      if (!result.ok) {
        throw new Error(result.error || 'Error al procesar cotización');
      }

      console.log('✅ Datos guardados en Airtable correctamente');

      if (flow === 'MANUAL') {
        hideLoading();
        bridge?.gtm?.('cotizador_v2_manual', { reason: flow_reason });
        setShowContactModal(true);
        return;
      }

      if (flow === 'BLOCKED') {
        hideLoading();
        bridge?.gtm?.('cotizador_v2_blocked', { reason: flow_reason });
        alert('Por el momento no podemos atender tu caso.');
        return;
      }

      const proposalFromBackend = mapBackendToProposal(result.proposal, formPayload.tarifa || '1', formPayload.periodicidad);

      const proposal = proposalFromBackend || generateProposal({
        hasCFE: hasCFE === 'si',
        plansCFE: planCFE === 'si',
        isAislado: planCFE === 'aislado',
        tarifa: formPayload.tarifa || '1',
        periodo: formPayload.periodicidad,
        pagoActual: formPayload.pago_promedio_mxn,
        estado: estado || 'Ciudad de México',
        cargas: cargas.length > 0 ? {
          ev: cargas.includes('ev') ? cargaDetalles.ev : undefined,
          minisplit: cargas.includes('minisplit') ? cargaDetalles.minisplit : undefined,
          secadora: cargas.includes('secadora'),
          bomba: cargas.includes('bomba'),
          otro: cargas.includes('otro')
        } : undefined,
        tipoInmueble: tipoInmueble,
        pisos: parseInt(pisos || '0', 10)
      });

      hideLoading();
      bridge?.gtm?.('cotizador_v2_auto', { pid: req_id });
      setGeneratedProposal(proposal);
      setShowResultModal(true);
    } catch (err) {
      console.error(err);
      hideLoading();
      alert('Ocurrió un error al procesar tu propuesta. Intenta de nuevo.');
    }
  };

  useEffect(() => {
    if (hasCFE !== 'si' || !pago) {
      setShowError(false);
      setErrorMessage('');
      return;
    }

    const pagoNum = parseFloat(pago);
    if (isNaN(pagoNum) || pagoNum <= 0) {
      setShowError(false);
      setErrorMessage('');
      return;
    }

    const bimestral = periodo === 'bimestral' ? pagoNum : pagoNum * 2;

    let minThreshold = 14000;
    let isHighThresholdState = false;

    if (estado) {
      minThreshold = getMinStateThreshold(estado);
      isHighThresholdState = isCDMXorMexico(estado);
    }

    // Adjust threshold based on period
    // If mensual: threshold is half of bimonthly (since 1 month = 0.5 * bimonthly)
    // If bimestral: threshold stays the same
    const effectiveThreshold = periodo === 'mensual' ? minThreshold / 2 : minThreshold;
    const paymentAmount = parseFloat(pago) || 0;

    if (paymentAmount < effectiveThreshold) {
      setShowError(true);
      if (isHighThresholdState) {
        const periodText = periodo === 'mensual' ? 'al mes' : 'al bimestre';
        setErrorMessage(`Por ahora sólo atendemos a casas o negocios que gastan arriba de ${effectiveThreshold.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })} ${periodText}.`);
      } else {
        setErrorMessage('Por ahora no atendemos en tu área, mantente en contacto para futuras oportunidades.');
      }
    } else {
      setShowError(false);
      setErrorMessage('');
    }
  }, [pago, periodo, showManual, hasCFE, knowsTariff, estado]);

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
              style={{ width: `${progressPercentage}%`, backgroundImage: 'linear-gradient(90deg, #3cd070, #1e3a2b)' }}
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

                  {/* Zona de upload + estados OCR */}
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:shadow-sm transition-colors">
                    {ocrStatus !== 'processing' && (
                      <>
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
                      </>
                    )}

                    {(ocrStatus === 'uploading' || ocrStatus === 'analyzing' || ocrStatus === 'extracting') && (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <div className="w-12 h-12 rounded-full border-4 border-slate-200 animate-spin" style={{ borderTopColor: '#1e3a2b' }} />
                        <p className="text-slate-700 font-semibold">{ocrMsg}</p>
                        <div className="flex gap-2 items-center">
                          <div className={`w-2 h-2 rounded-full ${ocrMsgIndex === 0 ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <div className={`w-2 h-2 rounded-full ${ocrMsgIndex === 1 ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <div className={`w-2 h-2 rounded-full ${ocrMsgIndex === 2 ? 'bg-green-500' : 'bg-slate-300'}`} />
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mt-2">
                          <p className="text-xs text-amber-800 font-semibold">⚠️ No cierres el navegador</p>
                        </div>
                      </div>
                    )}

                    {fileUploaded && ocrStatus !== 'uploading' && ocrStatus !== 'analyzing' && ocrStatus !== 'extracting' && (
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

                  {/* Mensaje de estado de OCR */}
                  {ocrStatus === 'ok' && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-green-800 font-semibold">Datos extraídos correctamente</p>
                        {ocrQuality != null && ocrQuality < 1 && <p className="text-xs text-green-700">Calidad OCR: {(ocrQuality * 100).toFixed(0)}%</p>}
                      </div>
                    </div>
                  )}
                  {ocrStatus === 'ok' && (
                    <div className="mt-6 text-left">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        ¿Ya tienes un sistema de paneles solares y planeas expandirlo?
                      </label>
                      <select
                        value={expand}
                        onChange={(e) => setExpand(e.target.value)}
                        className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                        style={{
                          outlineColor: '#3cd070',
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.5em 1.5em'
                        }}
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  )}
                  {ocrStatus === 'fail' && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-red-800 font-semibold">{ocrMsg || 'No se pudo leer tu recibo.'}</p>
                        <p className="text-xs text-red-700">Sube una imagen más nítida o captura tus datos manualmente.</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
                    <p className="text-sm text-slate-700">
                      <strong>Tip:</strong> Sube ambas páginas (frente y reverso) para mayor precisión.
                    </p>
                  </div>

                  {ocrStatus !== 'ok' && (
                    <>
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
                    </>
                  )}
                </div>
              ) : (
                // ----- Captura manual original (intacta) -----
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
                    {/* PASO 1: Estado */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Estado donde se encuentra el inmueble
                      </label>
                      <select
                        value={estado}
                        onChange={(e) => {
                          setEstado(e.target.value);
                          setHasCFE('');
                          setPlanCFE('');
                          setUsoCasaNegocio('');
                          setNumPersonasCasa('');
                          setRangoPersonasNegocio('');
                          setPago('');
                          setTarifa('');
                          setKnowsTariff('');
                          setCP('');
                          setExpand('');
                          setShowError(false);
                          setErrorMessage('');
                        }}
                        className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                        style={{
                          outlineColor: '#3cd070',
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.5em 1.5em'
                        }}
                      >
                        <option value="">Selecciona tu estado</option>
                        {getEstadosUnique().map((est) => (
                          <option key={est} value={est}>{est}</option>
                        ))}
                      </select>
                    </div>

                    {/* PASO 2: ¿Tienes contrato con CFE? */}
                    {estado && (
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
                            setPago('');
                            setTarifa('');
                            setKnowsTariff('');
                            setCP('');
                            setExpand('');
                            setShowError(false);
                            setErrorMessage('');
                          }}
                          className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                          style={{
                            outlineColor: '#3cd070',
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.5em 1.5em'
                          }}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="si">Sí</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    )}

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
                            setExpand('');
                          }}
                          className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                          style={{
                            outlineColor: '#3cd070',
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.5em 1.5em'
                          }}
                        >
                          <option value="">Selecciona una opción</option>
                          <option value="si">Sí</option>
                          <option value="aislado">No, quiero instalar un sistema independiente de la red de CFE</option>
                        </select>
                      </div>
                    )}

                    {hasCFE === 'no' && (planCFE === 'si' || planCFE === 'aislado') && (
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
                            className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                            style={{
                              outlineColor: '#3cd070',
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: 'right 0.5rem center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: '1.5em 1.5em'
                            }}
                          >
                            <option value="">Selecciona una opción</option>
                            <option value="casa">Casa</option>
                            <option value="negocio">Negocio</option>
                          </select>
                        </div>

                        {usoCasaNegocio === 'casa' && (
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              ¿Cuántas personas habitan el inmueble?
                            </label>
                            <select
                              value={numPersonasCasa}
                              onChange={(e) => setNumPersonasCasa(e.target.value)}
                              className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                              style={{
                                outlineColor: '#3cd070',
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em'
                              }}
                            >
                              <option value="">Selecciona el número de personas</option>
                              {HOUSE_MEMBER_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {usoCasaNegocio === 'negocio' && (
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              ¿Cuántos empleados trabajan en el inmueble?
                            </label>
                          <select
                            value={rangoPersonasNegocio}
                            onChange={(e) => setRangoPersonasNegocio(e.target.value)}
                              className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                              style={{
                                outlineColor: '#3cd070',
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em'
                              }}
                          >
                            <option value="">Selecciona un rango</option>
                            {BUSINESS_RANGE_OPTIONS.map(option => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        )}

                        {(planCFE === 'si' || planCFE === 'aislado') && (
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              ¿Ya tienes un sistema de paneles solares y planeas expandirlo?
                            </label>
                            <select
                              value={expand}
                              onChange={(e) => setExpand(e.target.value)}
                              className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                              style={{
                                outlineColor: '#3cd070',
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em'
                              }}
                            >
                              <option value="">Selecciona una opción</option>
                              <option value="si">Sí</option>
                              <option value="no">No</option>
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    {hasCFE === 'si' && (
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            ¿Ya has recibido por lo menos 1 recibo de CFE para este inmueble?
                          </label>
                          <select
                            value={justMoved}
                            onChange={(e) => {
                              setJustMoved(e.target.value);
                              if (e.target.value === 'si') {
                                setPago('');
                                setPeriodo('bimestral');
                              }
                            }}
                            className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                            style={{
                              outlineColor: '#3cd070',
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: 'right 0.5rem center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: '1.5em 1.5em'
                            }}
                          >
                            <option value="">Selecciona una opción</option>
                            <option value="si">Sí, tengo recibo</option>
                            <option value="no">No, apenas me mudé</option>
                          </select>
                        </div>

                        {justMoved === 'si' && (
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
                                min="1"
                                className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                                style={{
                                  outlineColor: '#3cd070',
                                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                  backgroundPosition: 'right 0.5rem center',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundSize: '1.5em 1.5em'
                                }}
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
                                className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                                style={{
                                  outlineColor: '#3cd070',
                                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                  backgroundPosition: 'right 0.5rem center',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundSize: '1.5em 1.5em'
                                }}
                              >
                                <option value="bimestral">Bimestral</option>
                                <option value="mensual">Mensual</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {justMoved === 'no' && (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                ¿Es para casa o negocio?
                              </label>
                              <select
                                value={usoCasaNegocio}
                                onChange={(e) => setUsoCasaNegocio(e.target.value)}
                                className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                                style={{
                                  outlineColor: '#3cd070',
                                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                  backgroundPosition: 'right 0.5rem center',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundSize: '1.5em 1.5em'
                                }}
                              >
                                <option value="">Selecciona una opción</option>
                                <option value="casa">Casa</option>
                                <option value="negocio">Negocio</option>
                              </select>
                            </div>

                            {usoCasaNegocio === 'casa' && (
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  ¿Cuántos habitantes hay en la casa?
                                </label>
                                <select
                                  value={numPersonasCasa}
                                  onChange={(e) => setNumPersonasCasa(e.target.value)}
                                  className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                                  style={{
                                    outlineColor: '#3cd070',
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 0.5rem center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '1.5em 1.5em'
                                  }}
                                >
                                  <option value="">Selecciona el número de personas</option>
                                  {HOUSE_MEMBER_OPTIONS.map(option => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {usoCasaNegocio === 'negocio' && (
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                  ¿Cuántos empleados trabajan en el inmueble?
                                </label>
                                <select
                                  value={rangoPersonasNegocio}
                                  onChange={(e) => setRangoPersonasNegocio(e.target.value)}
                                  className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                                  style={{
                                    outlineColor: '#3cd070',
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 0.5rem center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '1.5em 1.5em'
                                  }}
                                >
                                  <option value="">Selecciona un rango</option>
                                  {BUSINESS_RANGE_OPTIONS.map(option => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </>
                        )}

                        {shouldAskTariff && (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                ¿Conoces tu tarifa de CFE?
                              </label>
                              <select
                                value={knowsTariff}
                                onChange={(e) => {
                                  setKnowsTariff(e.target.value);
                                  if (e.target.value === 'no') {
                                    setTarifa('');
                                  }
                                }}
                                className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                                style={{
                                  outlineColor: '#3cd070',
                                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                  backgroundPosition: 'right 0.5rem center',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundSize: '1.5em 1.5em'
                                }}
                              >
                                <option value="">Selecciona una opción</option>
                                <option value="si">Sí</option>
                                <option value="no">No</option>
                              </select>
                            </div>

                            {knowsTariff === 'si' && (
                              <>
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Tarifa
                                  </label>
                                  <select
                                    value={tarifa}
                                    onChange={(e) => setTarifa(e.target.value)}
                                    className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                                    style={{
                                      outlineColor: '#3cd070',
                                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                      backgroundPosition: 'right 0.5rem center',
                                      backgroundRepeat: 'no-repeat',
                                      backgroundSize: '1.5em 1.5em'
                                    }}
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
                                  </select>
                                </div>
                              </>
                            )}

                            {knowsTariff === 'no' && justMoved === 'si' && (
                              <>
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    ¿Es para casa o negocio?
                                  </label>
                                  <select
                                    value={usoCasaNegocio}
                                    onChange={(e) => setUsoCasaNegocio(e.target.value)}
                                    className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                                    style={{
                                      outlineColor: '#3cd070',
                                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                      backgroundPosition: 'right 0.5rem center',
                                      backgroundRepeat: 'no-repeat',
                                      backgroundSize: '1.5em 1.5em'
                                    }}
                                  >
                                    <option value="">Selecciona una opción</option>
                                    <option value="casa">Casa</option>
                                    <option value="negocio">Negocio</option>
                                  </select>
                                </div>
                              </>
                            )}
                          </>
                        )}

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            ¿Ya tienes un sistema de paneles solares y planeas expandirlo?
                          </label>
                          <select
                            value={expand}
                            onChange={(e) => setExpand(e.target.value)}
                            className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                            style={{
                              outlineColor: '#3cd070',
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: 'right 0.5rem center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: '1.5em 1.5em'
                            }}
                          >
                            <option value="">Selecciona una opción</option>
                            <option value="si">Sí</option>
                            <option value="no">No</option>
                          </select>
                        </div>
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
                      ¿Apenas instalaste o planeas instalar dentro de los siguientes 3-6 meses alguno de estos?
                    </label>
                    <p className="text-xs text-slate-500 mb-3">
                      Selecciona al menos una opción. Elige los aparatos cuyo consumo no esté reflejado todavía en tu último recibo de CFE.
                    </p>
                    <div className="space-y-3">
                      {[
                        { value: 'ninguna', label: 'Ninguna' },
                        { value: 'ev', label: 'Cargador para coche eléctrico' },
                        { value: 'minisplit', label: 'Minisplit / Aire Acondicionado' },
                        { value: 'secadora', label: 'Secadora de ropa' },
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
                                  className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer text-sm"
                                  style={{
                                    outlineColor: '#3cd070',
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 0.75rem center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '1.25em 1.25em'
                                  }}
                                >
                                  <option value="">Selecciona el modelo</option>
                                  <option value="audi-etron-gt">Audi - e-tron GT</option>
                                  <option value="byd-yuan-plus">BYD - Yuan Plus</option>
                                  <option value="byd-dolphin-mini">BYD - Dolphin Mini (Seagull)</option>
                                  <option value="byd-dolphin">BYD - Dolphin</option>
                                  <option value="chevrolet-bolt-euv">Chevrolet - Bolt EUV</option>
                                  <option value="ford-escape">Ford - Escape</option>
                                  <option value="gwm-ora-03">GWM - Ora 03</option>
                                  <option value="hyundai-kona-electric">Hyundai - Kona Electric</option>
                                  <option value="hyundai-ioniq">Hyundai - Ioniq</option>
                                  <option value="jac-esei4">JAC - E-SEI4</option>
                                  <option value="kia-ev6">KIA - EV6</option>
                                  <option value="mg-mg4">MG - MG4</option>
                                  <option value="nissan-leaf">Nissan - Leaf</option>
                                  <option value="renault-kwid-etech">Renault - Kwid E-Tech</option>
                                  <option value="tesla-model3">Tesla - Model 3</option>
                                  <option value="tesla-modely">Tesla - Model Y</option>
                                  <option value="volkswagen-id4">Volkswagen - ID.4</option>
                                  <option value="volvo-ex30">Volvo - EX30</option>
                                  <option value="volvo-xc40-recharge">Volvo - XC40 Recharge</option>
                                  <option value="volvo-xc60-recharge">Volvo - XC60 Recharge</option>
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
                                  min="1"
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                  style={{ outlineColor: '#3cd070' }}
                                />
                              </div>
                            </div>
                          )}

                          {cargas.includes(item.value) && item.value === 'minisplit' && (
                            <div className="ml-8 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Cuántos minisplits / aires acondicionados</label>
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
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Horas diarias que estará(n) encendido(s)</label>
                                <input
                                  type="number"
                                  value={cargaDetalles.minisplit?.horas || ''}
                                  onChange={(e) => setCargaDetalles({
                                    ...cargaDetalles,
                                    minisplit: { ...cargaDetalles.minisplit, cantidad: cargaDetalles.minisplit?.cantidad || '', horas: e.target.value }
                                  })}
                                  placeholder="Ej. 6"
                                  min="0.5"
                                  step="0.5"
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                  style={{ outlineColor: '#3cd070' }}
                                />
                              </div>
                            </div>
                          )}

                          {cargas.includes(item.value) && item.value === 'secadora' && (
                            <div className="ml-8 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Horas semanales que planeas usarla</label>
                                <input
                                  type="number"
                                  value={cargaDetalles.secadora?.horas || ''}
                                  onChange={(e) => setCargaDetalles({
                                    ...cargaDetalles,
                                    secadora: { horas: e.target.value }
                                  })}
                                  placeholder="Ej. 4"
                                  min="0.5"
                                  step="0.5"
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2"
                                  style={{ outlineColor: '#3cd070' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    {cargas.length === 0 && (
                      <p className="text-xs text-red-600 mt-2">Debes elegir al menos una opción.</p>
                    )}
                    </div>

                    {showError && cargas.includes('ninguna') && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{errorMessage}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Tipo de inmueble
                      </label>
                      <select
                        value={tipoInmueble}
                        onChange={(e) => setTipoInmueble(e.target.value)}
                        className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                        style={{
                          outlineColor: '#3cd070',
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.5em 1.5em'
                        }}
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="1">Casa o negocio independiente de 1-2 pisos</option>
                        <option value="2">Departamento/local en edificio / condominio vertical</option>
                        <option value="3">Sólo áreas comunes de condominio / fraccionamiento</option>
                        <option value="9">Sólo áreas comunes de edificio vertical</option>
                        <option value="4">Local en plaza comercial o edificio</option>
                        <option value="5">Conjunto habitacional vertical / condominio vertical</option>
                        <option value="6">Conjunto habitacional horizontal / condominio horizontal</option>
                        <option value="7">Nave industrial / bodega</option>
                        <option value="8">Edificios enteros (hoteles, oficinas, públicos)</option>
                      </select>
                    </div>

                    {['2', '4', '5', '8', '9'].includes(tipoInmueble) && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          No. de pisos del edificio
                        </label>
                        <p className="text-xs text-slate-500 mb-2">Generalmente conectamos el sistema del sótano del edificio al techo (donde van los paneles solares)</p>
                        <input
                          type="number"
                          value={pisos}
                          onChange={(e) => setPisos(e.target.value)}
                          placeholder="Ej. 8"
                          min="1"
                          className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                          style={{
                            outlineColor: '#3cd070',
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.5em 1.5em'
                          }}
                        />
                      </div>
                    )}
                    {['3', '6', '7'].includes(tipoInmueble) && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          ¿Cuál es la distancia aproximada en metros de tu techo al centro de carga / tablero eléctrico del inmueble?
                        </label>
                        <p className="text-xs text-slate-500 mb-2">
                          Esto nos sirve para saber la cantidad de cableado que se necesitará
                        </p>
                        <input
                          type="number"
                          value={distanciaTechoTablero}
                          onChange={(e) => setDistanciaTechoTablero(e.target.value)}
                          placeholder="Ej. 30"
                          min="1"
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
                        className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                        style={{
                          outlineColor: '#3cd070',
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.5em 1.5em'
                        }}
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
                        className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 transition-all appearance-none bg-white cursor-pointer"
                        style={{
                          outlineColor: '#3cd070',
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.5em 1.5em'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '');
                        if (digits.length <= 10) setTelefono(digits);
                      }}
                      placeholder="55 1234 5678"
                      maxLength={10}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 transition-all"
                      style={{ outlineColor: '#3cd070' }}
                    />
                    {!phoneValid && telefono.length > 0 && (
                      <p className="text-xs text-red-600 mt-1">Debe tener 10 dígitos.</p>
                    )}
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
                        He leído y acepto el <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPrivacyModal(true); }}
                          className="underline"
                          style={{ color: '#3cd070' }}
                        >
                          aviso de privacidad
                        </button>
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
                  disabled={!phoneValid || !privacidad}
                  className="flex items-center gap-2 px-8 py-3 text-white font-bold rounded-xl hover:opacity-90 shadow-lg transition-all disabled:opacity-60"
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
      {showResultModal && generatedProposal && (
        <div className="fixed inset-0 bg-slate-50 overflow-y-auto z-50 proposal-overlay">
          <ProposalComponent proposal={generatedProposal} onClose={() => setShowResultModal(false)} userName={nombre} />
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
                Nuestro equipo revisará tu información y te contactaremos en breve.
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

      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]" onClick={() => setShowPrivacyModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-slate-900">Aviso de privacidad</h3>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 max-h-72 overflow-y-auto pr-2 text-sm text-slate-700 space-y-3">
              <p>
                Este es un texto provisional del aviso de privacidad. Aquí podrás colocar la redacción oficial
                sobre cómo se recopilan, utilizan y protegen los datos personales de los usuarios.
              </p>
              <p>
                La información detallará los fines del tratamiento de los datos, los mecanismos para ejercer
                derechos ARCO y los medios de contacto para cualquier aclaración.
              </p>
              <p>
                Reemplaza este texto con el contenido definitivo de tu aviso de privacidad. Mientras tanto,
                puedes usar este espacio para revisar el flujo y la experiencia de lectura.
              </p>
            </div>
            <div className="mt-6 text-right">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 rounded-lg text-white font-semibold"
                style={{ background: '#1e3a2b' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-[9999] bg-white/85 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-11 h-11 border-4 border-slate-200 rounded-full animate-spin mx-auto mb-3"
                 style={{ borderTopColor: '#1e3a2b' }}></div>
            <div className="font-extrabold text-slate-900">{loadingMsg}</div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mt-4 inline-block">
              <p className="text-xs text-amber-800 font-semibold">⚠️ No cierres el navegador</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
