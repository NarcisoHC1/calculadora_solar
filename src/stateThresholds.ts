export interface StateThreshold {
  estado: string;
  min_bimonthly_payment_threshold: number;
  max_bimonthly_payment_threshold: number;
}

export const stateThresholds: StateThreshold[] = [
  { estado: "Aguascalientes", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Baja California", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Baja California Sur", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Campeche", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Chiapas", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Chihuahua", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Ciudad de México", min_bimonthly_payment_threshold: 2000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Coahuila de Zaragoza", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Colima", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Durango", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Guanajuato", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Guerrero", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Hidalgo", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Jalisco", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Michoacán de Ocampo", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Morelos", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Estado de México", min_bimonthly_payment_threshold: 2000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Nayarit", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Nuevo León", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Oaxaca", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Puebla", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Querétaro", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Quintana Roo", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "San Luis Potosí", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Sinaloa", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Sonora", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Tabasco", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Tamaulipas", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Tlaxcala", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Veracruz de Ignacio de la Llave", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Yucatán", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 },
  { estado: "Zacatecas", min_bimonthly_payment_threshold: 14000, max_bimonthly_payment_threshold: 14000 }
];

export function getMinStateThreshold(estado: string): number {
  const stateData = stateThresholds.find(s => s.estado === estado);
  return stateData?.min_bimonthly_payment_threshold || 14000;
}

export function getMaxStateThreshold(estado: string): number {
  const stateData = stateThresholds.find(s => s.estado === estado);
  return stateData?.max_bimonthly_payment_threshold || 14000;
}

export function getEstadosUnique(): string[] {
  return stateThresholds.map(s => s.estado).sort();
}

export function isCDMXorMexico(estado: string): boolean {
  return estado === 'Ciudad de México' || estado === 'Estado de México';
}
