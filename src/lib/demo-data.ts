// Demo data generator - works without database
import { Auction } from './types';

const provincias = [
  { nombre: 'Madrid', lat: 40.42, lng: -3.70, municipios: ['Madrid', 'Alcalá de Henares', 'Getafe', 'Leganes', 'Fuenlabrada'] },
  { nombre: 'Barcelona', lat: 41.39, lng: 2.17, municipios: ['Barcelona', 'Hospitalet', 'Badalona', 'Sabadell', 'Terrassa'] },
  { nombre: 'Valencia', lat: 39.47, lng: -0.38, municipios: ['Valencia', 'Torrent', 'Gandia', 'Paterna'] },
  { nombre: 'Sevilla', lat: 37.39, lng: -5.98, municipios: ['Sevilla', 'Dos Hermanas', 'Alcalá de Guadaira'] },
  { nombre: 'Málaga', lat: 36.72, lng: -4.42, municipios: ['Málaga', 'Marbella', 'Fuengirola', 'Torremolinos'] },
  { nombre: 'Alicante', lat: 38.35, lng: -0.48, municipios: ['Alicante', 'Elche', 'Benidorm', 'Torrevieja'] },
  { nombre: 'Murcia', lat: 37.99, lng: -1.13, municipios: ['Murcia', 'Cartagena', 'Lorca'] },
  { nombre: 'Zaragoza', lat: 41.65, lng: -0.88, municipios: ['Zaragoza', 'Calatayud', 'Utebo'] },
  { nombre: 'Bilbao', lat: 43.26, lng: -2.93, municipios: ['Bilbao', 'Getxo', 'Barakaldo'] },
  { nombre: 'Valladolid', lat: 41.65, lng: -4.72, municipios: ['Valladolid', 'Laguna de Duero'] },
  { nombre: 'Granada', lat: 37.18, lng: -3.60, municipios: ['Granada', 'Motril', 'Almuñécar'] },
  { nombre: 'Tarragona', lat: 41.12, lng: 1.25, municipios: ['Tarragona', 'Reus', 'Salou'] },
  { nombre: 'Toledo', lat: 39.86, lng: -4.02, municipios: ['Toledo', 'Talavera de la Reina'] },
  { nombre: 'Córdoba', lat: 37.89, lng: -4.78, municipios: ['Córdoba', 'Lucena', 'Puente Genil'] },
  { nombre: 'Cádiz', lat: 36.53, lng: -6.29, municipios: ['Cádiz', 'Jerez de la Frontera', 'Algeciras'] },
  { nombre: 'Badajoz', lat: 38.88, lng: -6.97, municipios: ['Badajoz', 'Mérida', 'Don Benito'] },
  { nombre: 'A Coruña', lat: 43.37, lng: -8.40, municipios: ['A Coruña', 'Santiago', 'Ferrol'] },
  { nombre: 'Girona', lat: 41.98, lng: 2.82, municipios: ['Girona', 'Figueres', 'Blanes'] },
  { nombre: 'Asturias', lat: 43.36, lng: -5.85, municipios: ['Oviedo', 'Gijón', 'Avilés'] },
  { nombre: 'Navarra', lat: 42.82, lng: -1.64, municipios: ['Pamplona', 'Tudela', 'Barañáin'] },
  { nombre: 'Almería', lat: 36.84, lng: -2.46, municipios: ['Almería', 'Roquetas de Mar'] },
  { nombre: 'Castellón', lat: 39.98, lng: -0.05, municipios: ['Castellón', 'Villarreal', 'Burriana'] },
  { nombre: 'Jaén', lat: 37.77, lng: -3.79, municipios: ['Jaén', 'Linares', 'Úbeda'] },
  { nombre: 'Huelva', lat: 37.26, lng: -6.94, municipios: ['Huelva', 'Lepe', 'Isla Cristina'] },
  { nombre: 'León', lat: 42.60, lng: -5.57, municipios: ['León', 'Ponferrada', 'San Andrés'] },
  { nombre: 'Burgos', lat: 42.34, lng: -3.70, municipios: ['Burgos', 'Miranda de Ebro'] },
  { nombre: 'Cantabria', lat: 43.46, lng: -3.80, municipios: ['Santander', 'Torrelavega'] },
  { nombre: 'Vizcaya', lat: 43.26, lng: -2.93, municipios: ['Bilbao', 'Getxo', 'Portugalete'] },
  { nombre: 'Las Palmas', lat: 28.12, lng: -15.43, municipios: ['Las Palmas', 'Telde', 'Arucas'] },
  { nombre: 'Santa Cruz de Tenerife', lat: 28.47, lng: -16.25, municipios: ['Santa Cruz', 'La Laguna'] },
];

const tipos = [
  { tipo: 'Vivienda', peso: 60, precioMin: 40000, precioMax: 400000 },
  { tipo: 'Garaje', peso: 10, precioMin: 3000, precioMax: 18000 },
  { tipo: 'Solar', peso: 8, precioMin: 15000, precioMax: 180000 },
  { tipo: 'Finca rústica', peso: 5, precioMin: 10000, precioMax: 90000 },
  { tipo: 'Local comercial', peso: 8, precioMin: 25000, precioMax: 250000 },
  { tipo: 'Nave industrial', peso: 4, precioMin: 35000, precioMax: 300000 },
  { tipo: 'Vehículo', peso: 5, precioMin: 2000, precioMax: 35000 },
];

const fuentes = [
  { source: 'boe', peso: 60 },
  { source: 'hacienda', peso: 25 },
  { source: 'seguridad-social', peso: 15 },
];

const calles = [
  'Calle Gran Vía', 'Av. de la Constitución', 'Calle Mayor', 'Paseo de la Castellana',
  'Rambla de Cataluña', 'Calle Alcalá', 'Av. del Puerto', 'Calle Serrano',
  'Paseo Marítimo', 'Calle Larios', 'Av. de América', 'Plaza del Sol',
  'Calle de Preciados', 'Glorieta de Bilbao', 'Calle de Velázquez',
];

const descripciones: Record<string, string[]> = {
  'Vivienda': [
    'Piso en tercera planta con ascensor. 3 habitaciones, salón, cocina equipada y baño. Calefacción central. Zona bien comunicada.',
    'Apartamento de 75m², dos habitaciones, baño, cocina americana y terraza. Orientación sur. Comunidad incluida.',
    'Dúplex en planta baja con jardín privado. 4 habitaciones, 2 baños, garaje y trastero. Urbanización con piscina.',
    'Estudio reformado de 40m² en el centro. Cocina abierta, baño con ducha. Ideal inversión o primera vivienda.',
    'Ático con terraza de 30m² y vistas panorámicas. 3 habitaciones, 2 baños. Parking subterráneo incluido.',
  ],
  'Garaje': [
    'Plaza de garaje en sótano 2. Amplia, para turismo. Con pilón de recarga eléctrica.',
    'Plaza de garaje doble en primera línea de playa. Acceso por rampa.',
  ],
  'Solar': [
    'Solar urbano de 500m² en zona residencial. Calificación: plurifamiliar. Servicios en fachada.',
    'Parcela de 800m² en zona de expansión urbana. Edificabilidad 0.8. Cerca de centro comercial.',
  ],
  'Finca rústica': [
    'Finca rústica de 2Ha con olivar en producción. Acceso por camino asfaltado. Valla perimetral.',
    'Parcela rústica de 5Ha con pozo de agua. Terreno llano, apto para cultivo.',
  ],
  'Local comercial': [
    'Local en planta baja con escaparate de 6m a calle principal. 80m² útiles. Instalación de climatización.',
    'Comercial de 120m² en zona peatonal. Dos accesos. Cámara de seguridad. Ideal hostelería.',
  ],
  'Nave industrial': [
    'Nave de 400m² en polígono industrial. Puerta de acceso para camiones. Oficina de 40m². Cubierta a dos aguas.',
    'Nave logística de 800m² con muelle de carga. Altura libre 8m. Suelo de hormigón pulido.',
  ],
  'Vehículo': [
    'BMW 320d, 2021, 45.000km. Diésel 2.0, automático. Estado: bueno. ITV vigente.',
    'Volkswagen Golf 1.5 TSI, 2022, 22.000km. Gasolina, manual. Color blanco. Full equip.',
    'Mercedes CLK 220 CDI, 2019, 78.000km. Diésel, automático. Cuero, techo solar.',
  ],
};

const organismos = [
  'Juzgado de Primera Instancia e Instrucción nº 1', 'Juzgado de Primera Instancia nº 3',
  'Juzgado de lo Mercantil nº 2', 'Agencia Tributaria - Delegación Provincial',
  'Tesorería General de la Seguridad Social', 'Ayuntamiento - Intervención Municipal',
  'Juzgado de Primera Instancia nº 5', 'Agencia Estatal de Administración Tributaria',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted(items: { peso: number }[]): number {
  const total = items.reduce((s, i) => s + i.peso, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= items[i].peso;
    if (r <= 0) return i;
  }
  return items.length - 1;
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Seeded random for consistent results
let seed = 42;
function seededRandom(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

// Generate demo auctions once
let _demoAuctions: Auction[] | null = null;

export function getDemoAuctions(filters?: Record<string, string>): { auctions: Auction[]; total: number } {
  const auctions = generateDemoAuctions();
  let filtered = [...auctions];

  if (filters) {
    if (filters.provincia) {
      filtered = filtered.filter(a => a.provincia?.toLowerCase() === filters.provincia!.toLowerCase());
    }
    if (filters.tipo_bien) {
      filtered = filtered.filter(a => a.tipo_bien === filters.tipo_bien);
    }
    if (filters.source) {
      filtered = filtered.filter(a => a.source === filters.source);
    }
    if (filters.estado) {
      filtered = filtered.filter(a => a.estado === filters.estado);
    }
    if (filters.precio_min) {
      filtered = filtered.filter(a => (a.valor_subasta || 0) >= Number(filters.precio_min));
    }
    if (filters.precio_max) {
      filtered = filtered.filter(a => (a.valor_subasta || 0) <= Number(filters.precio_max));
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(a =>
        a.titulo?.toLowerCase().includes(q) ||
        a.municipio?.toLowerCase().includes(q) ||
        a.direccion?.toLowerCase().includes(q) ||
        a.provincia?.toLowerCase().includes(q) ||
        a.referencia_catastral?.includes(q)
      );
    }
  }

  // Sort
  const sort = filters?.sort || 'fecha_fin_asc';
  switch (sort) {
    case 'precio_asc': filtered.sort((a, b) => (a.valor_subasta || 0) - (b.valor_subasta || 0)); break;
    case 'precio_desc': filtered.sort((a, b) => (b.valor_subasta || 0) - (a.valor_subasta || 0)); break;
    case 'fecha_fin_asc': filtered.sort((a, b) => new Date(a.fecha_fin || '').getTime() - new Date(b.fecha_fin || '').getTime()); break;
    case 'fecha_desc': filtered.sort((a, b) => new Date(b.fecha_fin || '').getTime() - new Date(a.fecha_fin || '').getTime()); break;
  }

  const page = Number(filters?.page || '1');
  const limit = 20;
  const start = (page - 1) * limit;

  return {
    auctions: filtered.slice(start, start + limit),
    total: filtered.length,
  };
}

export function getDemoAuctionById(id: number): Auction | undefined {
  return generateDemoAuctions().find(a => a.id === id);
}

export function getDemoStats() {
  const auctions = generateDemoAuctions();
  const active = auctions.filter(a => a.estado === 'activa');
  const totalByProvince: Record<string, number> = {};
  const totalByTipo: Record<string, number> = {};
  
  for (const a of active) {
    if (a.provincia) totalByProvince[a.provincia] = (totalByProvince[a.provincia] || 0) + 1;
    if (a.tipo_bien) totalByTipo[a.tipo_bien] = (totalByTipo[a.tipo_bien] || 0) + 1;
  }

  return {
    totalActive: active.length,
    totalByProvince,
    totalByTipo,
    newToday: Math.floor(active.length * 0.05),
    lastUpdated: new Date().toISOString(),
  };
}

function generateDemoAuctions(): Auction[] {
  if (_demoAuctions) return _demoAuctions;

  seed = 42; // Reset seed for consistency
  const now = Date.now();
  const auctions: Auction[] = [];

  for (let i = 1; i <= 350; i++) {
    const prov = provincias[i % provincias.length];
    const muni = pick(prov.municipios);
    const tipoIdx = pickWeighted(tipos);
    const tipo = tipos[tipoIdx];
    const sourceIdx = pickWeighted(fuentes);
    const source = fuentes[sourceIdx].source;
    
    const precio = Math.round(randBetween(tipo.precioMin, tipo.precioMax));
    const pujaMin = Math.round(precio * 0.5);
    const tienePuja = seededRandom() > 0.35;
    const pujaActual = tienePuja ? Math.round(pujaMin + seededRandom() * precio * 0.3) : undefined;

    const diasInicio = Math.floor(seededRandom() * 30);
    const diasFin = Math.floor(seededRandom() * 60) + 1;
    const fechaInicio = new Date(now - diasInicio * 86400000);
    const fechaFin = new Date(now + diasFin * 86400000);

    const calle = pick(calles);
    const numero = 1 + Math.floor(seededRandom() * 150);
    const desc = descripciones[tipo.tipo] ? pick(descripciones[tipo.tipo]) : 'Bien inmueble en subasta pública.';
    const org = `${pick(organismos)} de ${prov.nombre}`;
    const sourceId = `${source}-2024-${String(i).padStart(5, '0')}`;

    const titulo = `${tipo.tipo === 'Vehículo' ? 'Vehículo en' : tipo.tipo === 'Garaje' ? 'Garaje en' : tipo.tipo + ' en'} ${calle}, ${numero}, ${muni}`;

    auctions.push({
      id: i,
      source,
      source_id: sourceId,
      tipo_bien: tipo.tipo,
      provincia: prov.nombre,
      municipio: muni,
      direccion: `${calle}, ${numero}, ${muni}`,
      valor_subasta: precio,
      puja_minima: pujaMin,
      puja_actual: pujaActual || undefined,
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      estado: 'activa',
      descripcion: desc,
      organismo: org,
      url_detalle: source === 'boe' ? `https://subastas.boe.es/detail.php?id=${sourceId}` :
        source === 'hacienda' ? `https://subastas.hacienda.gob.es/${sourceId}` :
        `https://subastas.seg-social.es/${sourceId}`,
      referencia_catastral: `${String(Math.floor(seededRandom() * 99999999)).padStart(8, '0')}J`,
      lat: prov.lat + (seededRandom() - 0.5) * 0.3,
      lng: prov.lng + (seededRandom() - 0.5) * 0.3,
      imagen_url: undefined,
      created_at: fechaInicio.toISOString(),
      updated_at: new Date().toISOString(),
      titulo,
    });
  }

  _demoAuctions = auctions;
  return auctions;
}
