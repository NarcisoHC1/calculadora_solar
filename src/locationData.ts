export interface LocationEntry {
  division: string;
  entidad: string;
  municipios: string;
  cfe_tarifa: string;
  min_bimonthly_payment_threshold: number;
  max_bimonthly_payment_threshold: number;
}

export const locationData: LocationEntry[] = [
  {
    division: "Baja California",
    entidad: "Baja California",
    municipios: "Ensenada, Mexicali, Playas de Rosarito, San Felipe, San Quintín, Tecate, Tijuana",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Baja California",
    entidad: "Sonora",
    municipios: "General Plutarco Elías Calles, Puerto Peñasco, San Luis Río Colorado",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "Aguascalientes",
    municipios: "Aguascalientes, Asientos, Calvillo, Cosío, El Llano, Jesús María, Pabellón de Arteaga, Rincón de Romos, San Francisco de los Romo, San José de Gracia, Tepezalá",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "Coahuila de Zaragoza",
    municipios: "Parras, Saltillo, San Pedro",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "Durango",
    municipios: "General Simón Bolívar, Guadalupe Victoria, Santa Clara",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "Guanajuato",
    municipios: "Abasolo, Acámbaro, Apaseo el Alto, Apaseo el Grande, Atarjea, Celaya, Comonfort, Coroneo, Cortazar, Cuerámaro, Doctor Mora, Dolores Hidalgo Cuna de la Independencia Nacional, Guanajuato, Huanímaro, Irapuato, Jaral del Progreso, Jerécuaro, León, Manuel Doblado, Moroleón, Ocampo, Pénjamo, Pueblo Nuevo, Purísima del Rincón, Romita, Salamanca, Salvatierra, San Diego de la Unión, San Felipe, San Francisco del Rincón, San José Iturbide, San Luis de la Paz, San Miguel de Allende, Santa Catarina, Santa Cruz de Juventino Rosas, Santiago Maravatío, Silao de la Victoria, Tarandacuao, Tarimoro, Tierra Blanca, Uriangato, Valle de Santiago, Victoria, Villagrán, Xichú, Yuriria",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "Hidalgo",
    municipios: "Alfajayucan, Cardonal, Chapulhuacán, Eloxochitlán, Huichapan, Ixmiquilpan, Jacala de Ledezma, La Misión, Metztitlán, Nicolás Flores, Nopala de Villagrán, Pacula, Pisaflores, Tasquillo, Tecozautla, Tepehuacán de Guerrero, Tlahuiltepa, Zimapán",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "Jalisco",
    municipios: "Bolaños, Chimaltitán, Colotlán, Degollado, Encarnación de Díaz, Huejúcar, Huejuquilla el Alto, Jesús María, Lagos de Moreno, Mezquitic, Ojuelos de Jalisco, San Diego de Alejandría, San Martín de Bolaños, Santa María de los Ángeles, Teocaltiche, Totatiche, Unión de San Antonio, Villa Guerrero, Villa Hidalgo",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "Estado de México",
    municipios: "Jilotepec, Polotitlán",
    cfe_tarifa: "1",
    min_bimonthly_payment_threshold: 2000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "Michoacán de Ocampo",
    municipios: "Contepec, Cuitzeo, Epitacio Huerta, José Sixto Verduzco, Maravatío, Santa Ana Maya",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "Querétaro",
    municipios: "Amealco de Bonfil, Arroyo Seco, Cadereyta de Montes, Colón, Corregidora, El Marqués, Ezequiel Montes, Huimilpan, Pedro Escobedo, Peñamiller, Pinal de Amoles, Querétaro, San Joaquín, San Juan del Río, Tequisquiapan, Tolimán",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "San Luis Potosí",
    municipios: "Ahualulco, Moctezuma, Salinas, Santo Domingo, Vanegas, Villa de Arriaga, Villa de Ramos",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Bajío",
    entidad: "Zacatecas",
    municipios: "Apozol, Atolinga, Benito Juárez, Calera, Cañitas de Felipe Pescador, Chalchihuites, Concepción del Oro, Cuauhtémoc, El Plateado de Joaquín Amaro, El Salvador, Fresnillo, Genaro Codina, General Enrique Estrada, General Francisco R. Murguía, General Pánfilo Natera, Guadalupe, Huanusco, Jalpa, Jerez, Jiménez del Teul, Juan Aldama, Juchipila, Loreto, Luis Moya, Mazapil, Melchor Ocampo, Mezquital del Oro, Miguel Auza, Momax, Monte Escobedo, Morelos, Moyahua de Estrada, Nochistlán de Mejía, Noria de Ángeles, Ojocaliente, Pánuco, Pinos, Río Grande, Sain Alto, Santa María de la Paz, Sombrerete, Susticacán, Tabasco, Tepechitlán, Tepetongo, Teúl de González Ortega, Tlaltenango de Sánchez Román, Trancoso, Trinidad García de la Cadena, Valparaíso, Vetagrande, Villa de Cos, Villa García, Villa González Ortega, Villa Hidalgo, Villanueva, Zacatecas",
    cfe_tarifa: "1B",
    min_bimonthly_payment_threshold: 13000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Centro Oriente",
    entidad: "Estado de México",
    municipios: "Ixtapaluca",
    cfe_tarifa: "1",
    min_bimonthly_payment_threshold: 2000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "Centro Sur",
    entidad: "Estado de México",
    municipios: "Acambay de Ruíz Castañeda, Aculco, Almoloya de Alquisiras, Almoloya de Juárez, Amanalco, Amatepec, Atlacomulco, Chapa de Mota, Coatepec Harinas, Donato Guerra, El Oro, Ixtapan de la Sal, Ixtapan del Oro, Ixtlahuaca, Jilotepec, Jiquipilco, Jocotitlán, Luvianos, Morelos, Otzoloapan, Polotitlán, San Felipe del Progreso, San José del Rincón, San Simón de Guerrero, Santo Tomás, Soyaniquilpan de Juárez, Sultepec, Tejupilco, Temascalcingo, Temascaltepec, Temoaya, Tenancingo, Texcaltitlán, Timilpan, Tlatlaya, Tonatico, Valle de Bravo, Villa de Allende, Villa del Carbón, Villa Guerrero, Villa Victoria, Zacazonapan, Zacualpan, Zinacantepec, Zumpahuacán",
    cfe_tarifa: "1",
    min_bimonthly_payment_threshold: 2000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "División Valle de México Centro",
    entidad: "Ciudad de México",
    municipios: "Álvaro Obregón, Azcapotzalco, Benito Juárez, Cuajimalpa de Morelos, Cuauhtémoc, Gustavo A. Madero, Iztacalco, Iztapalapa, Miguel Hidalgo, Venustiano Carranza",
    cfe_tarifa: "1",
    min_bimonthly_payment_threshold: 2000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "División Valle de México Centro",
    entidad: "Estado de México",
    municipios: "Atenco, Chiautla, Chicoloapan, Chiconcuac, Chimalhuacán, Huixquilucan, La Paz, Naucalpan de Juárez, Nezahualcóyotl, Papalotla, Tepetlaoxtoc, Texcoco",
    cfe_tarifa: "1",
    min_bimonthly_payment_threshold: 2000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "División Valle de México Norte",
    entidad: "Ciudad de México",
    municipios: "Álvaro Obregón, Azcapotzalco, Gustavo A. Madero, Miguel Hidalgo",
    cfe_tarifa: "1",
    min_bimonthly_payment_threshold: 2000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "División Valle de México Norte",
    entidad: "Estado de México",
    municipios: "Acolman, Apaxco, Atenco, Atizapán de Zaragoza, Axapusco, Chiautla, Coacalco de Berriozábal, Coyotepec, Cuautitlán, Cuautitlán Izcalli, Ecatepec de Morelos, Huehuetoca, Hueypoxtla, Huixquilucan, Isidro Fabela, Jaltenco, Jilotzingo, Melchor Ocampo, Naucalpan de Juárez, Nextlalpan, Nezahualcóyotl, Nicolás Romero, Nopaltepec, Otumba, San Martín de las Pirámides, Tecámac, Temascalapa, Teoloyucan, Teotihuacán, Tepetlaoxtoc, Tepotzotlán, Tequixquiac, Texcoco, Tezoyuca, Tlalnepantla de Baz, Tonanitla, Tultepec, Tultitlán, Zumpango",
    cfe_tarifa: "1",
    min_bimonthly_payment_threshold: 2000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "División Valle de México Sur",
    entidad: "Ciudad de México",
    municipios: "Álvaro Obregón, Coyoacán, Cuajimalpa de Morelos, Iztapalapa, La Magdalena Contreras, Milpa Alta, Tláhuac, Tlalpan, Xochimilco",
    cfe_tarifa: "1",
    min_bimonthly_payment_threshold: 2000,
    max_bimonthly_payment_threshold: 13000
  },
  {
    division: "División Valle de México Sur",
    entidad: "Estado de México",
    municipios: "Almoloya del Río, Amecameca, Atizapán, Atlautla, Ayapango, Calimaya, Capulhuac, Chalco, Chapultepec, Cocotitlán, Ecatzingo, Huixquilucan, Ixtapaluca, Joquicingo, Juchitepec, Lerma, Malinalco, Metepec, Mexicaltzingo, Ocoyoacac, Ocuilan, Otzolotepec, Ozumba, Rayón, San Antonio la Isla, San Mateo Atenco, Temamatla, Tenancingo, Tenango del Aire, Tenango del Valle, Tepetlixpa, Texcalyacac, Tianguistenco, Tlalmanalco, Toluca, Valle de Chalco Solidaridad, Xalatlaco, Xonacatlán, Zinacantepec",
    cfe_tarifa: "1",
    min_bimonthly_payment_threshold: 2000,
    max_bimonthly_payment_threshold: 13000
  }
];

export function getEstadosUnique(): string[] {
  const estados = new Set<string>();
  locationData.forEach(entry => estados.add(entry.entidad));
  return Array.from(estados).sort();
}

export function getMunicipiosByEstado(estado: string): string[] {
  const munics = new Set<string>();
  locationData
    .filter(entry => entry.entidad === estado)
    .forEach(entry => {
      entry.municipios.split(',').forEach(m => munics.add(m.trim()));
    });
  return Array.from(munics).sort();
}

export function getLocationInfo(estado: string, municipio: string): LocationEntry | null {
  for (const entry of locationData) {
    if (entry.entidad === estado) {
      const munics = entry.municipios.split(',').map(m => m.trim());
      if (munics.includes(municipio)) {
        return entry;
      }
    }
  }
  return null;
}
