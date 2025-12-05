export interface ProposalInput {
  hasCFE: boolean;
  plansCFE: boolean;
  isAislado: boolean;
  tarifa: string;
  periodo: 'mensual' | 'bimestral';
  pagoActual: number;
  consumoKwh?: number;
  estado?: string;
  municipio?: string;
  cargas?: {
    ev?: { modelo: string; km: string };
    minisplit?: { cantidad: string; horas: string };
    secadora?: boolean;
    bomba?: boolean;
    otro?: boolean;
  };
  tipoInmueble: string;
  pisos?: number;
  hasDAP?: boolean;
  dapAmount?: number;
  tarifaParams?: Partial<TarifaParams>;
}

export interface Tarifa1Params {
  buckets: { limit: number; price: number }[];
  minimo_mensual: number;
  minimo_mensual_kwh: number;
  basico: number;
}

export interface TarifaDACParams {
  fijo_mensual: number;
  precio_kwh: number;
  minimo_mensual: number;
}

export interface TarifaPDBTParams {
  fijo_mensual: number;
  precio_kwh: number;
  minimo_mensual: number;
}

export interface TarifaParams {
  tarifa1: Tarifa1Params;
  tarifaDAC: TarifaDACParams;
  tarifaPDBT: TarifaPDBTParams;
}

export interface SystemSpec {
  numPaneles: number;
  potenciaPorPanel: 555 | 600 | 620 | 650;
  potenciaTotal: number;
  generacionMensualKwh: number;
  generacionAnualKwh: number;
  microinversor?: {
    marca: string;
    modelo: string;
    cantidad: number;
    mppt: 2 | 4;
  };
  inversorString?: {
    marca: string;
    modelo: string;
    potencia: number;
  };
  montaje: {
    marca: string;
  };
}

export interface FinancialBreakdown {
  pagoAhora: number;
  pagoFuturo: number;
  ahorroBimestral: number;
  anosRetorno: number;
  precioLista: number;
  descuento: number;
  subtotal: number;
  iva: number;
  total: number;
  anticipo: number;
  pagoPostInterconexion: number;
  pagosEnExhibiciones?: number[];
  secuenciaExhibiciones?: number[];
  descuentoPorcentaje?: number;
  ahorroEn25?: number;
}

export interface EnvironmentalImpact {
  arboles: number;
  barrilesPetroleo: number;
  toneladasCO2: number;
}

export interface ComponentBreakdown {
  concepto: string;
  cantidad: number;
  marca: string;
  modelo: string;
  type?: 'panel' | 'microinverter' | 'inverter' | 'montaje';
  productWarrantyYears?: number;
  generationWarrantyYears?: number;
  capacityWatts?: number;
  capacityKw?: number;
  measurementsM2?: number;
}

export interface ProposalData {
  input: ProposalInput;
  system: SystemSpec;
  financial: FinancialBreakdown;
  environmental: EnvironmentalImpact;
  components: ComponentBreakdown[];
  porcentajeCobertura: number;
  showDACWarning?: boolean;
  dacBimonthlyPayment?: number;
  dacFinancial?: FinancialBreakdown;
}

export interface DualProposal {
  current: ProposalData;
  future?: ProposalData;
}

// Alias used by the app state
export type Proposal = DualProposal;
