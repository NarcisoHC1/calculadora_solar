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
