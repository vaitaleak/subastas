// Seed script: Generate sample auction data for development
// Run: npx tsx src/scripts/seed.ts

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'subastas.db');
const db = new Database(DB_PATH);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    tipo_bien TEXT,
    provincia TEXT,
    municipio TEXT,
    direccion TEXT,
    valor_subasta REAL,
    puja_minima REAL,
    puja_actual REAL,
    fecha_inicio TEXT,
    fecha_fin TEXT,
    estado TEXT DEFAULT 'activa',
    descripcion TEXT,
    organismo TEXT,
    url_detalle TEXT,
    referencia_catastral TEXT,
    lat REAL,
    lng REAL,
    imagen_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(source, source_id)
  );

  CREATE INDEX IF NOT EXISTS idx_auctions_provincia ON auctions(provincia);
  CREATE INDEX IF NOT EXISTS idx_auctions_tipo ON auctions(tipo_bien);
  CREATE INDEX IF NOT EXISTS idx_auctions_estado ON auctions(estado);
  CREATE INDEX IF NOT EXISTS idx_auctions_fecha_fin ON auctions(fecha_fin);

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    filtros_json TEXT NOT NULL,
    activa INTEGER DEFAULT 1,
    token_verificacion TEXT,
    verificada INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    auction_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (auction_id) REFERENCES auctions(id)
  );
`);

const provincias = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Alicante',
  'Murcia', 'Zaragoza', 'Bilbao', 'Valladolid', 'Granada', 'Tarragona',
  'Toledo', 'Córdoba', 'Cádiz', 'Badajoz', 'A Coruña', 'Vizcaya',
  'Girona', 'Asturias', 'Cantabria', 'Navarra', 'Almería', 'Castellón',
  'Jaén', 'Huelva', 'Lleida', 'León', 'Burgos', 'Segovia'
];

const municipiosPorProvincia: Record<string, string[]> = {
  'Madrid': ['Madrid', 'Alcalá de Henares', 'Getafe', 'Leganes', 'Fuenlabrada', 'Móstoles'],
  'Barcelona': ['Barcelona', 'Hospitalet de Llobregat', 'Badalona', 'Sabadell', 'Terrassa'],
  'Valencia': ['Valencia', 'Torrent', 'Gandia', 'Paterna', 'Sagunto'],
  'Sevilla': ['Sevilla', 'Dos Hermanas', 'Alcalá de Guadaira', 'Utrera'],
  'Málaga': ['Málaga', 'Marbella', 'Fuengirola', 'Torremolinos', 'Vélez-Málaga'],
  'Alicante': ['Alicante', 'Elche', 'Torrevieja', 'Benidorm', 'Alcoy'],
};

const tipos = ['Vivienda', 'Garaje', 'Solar', 'Finca rústica', 'Local comercial', 'Nave industrial', 'Vehículo'];
const fuentes = ['boe', 'hacienda', 'seguridad-social'];
const organismos = [
  'Juzgado de Primera Instancia nº 1 de Madrid',
  'Juzgado de Primera Instancia nº 3 de Barcelona',
  'Agencia Tributaria - Delegación de Valencia',
  'Tesorería General de la Seguridad Social',
  'Juzgado de Primera Instancia nº 5 de Sevilla',
  'Agencia Tributaria - Delegación de Málaga',
  'Ayuntamiento de Alicante',
  'Juzgado de Primera Instancia nº 2 de Zaragoza',
];

const descripciones = [
  'Piso en tercera planta, edificio con ascensor. Tres habitaciones, salón, cocina y baño. Calefacción central. Zona bien comunicada con transporte público.',
  'Local comercial en planta baja, con escaparate a calle principal. 80m² útiles. Ideal para negocio de hostelería o retail.',
  'Garaje en sótano segundo de edificio residencial. Plaza amplia para turismo. Acceso por rampa mecánica.',
  'Solar urbano de 500m² en zona residencial. Calificación urbanística: residencial plurifamiliar. Todos los servicios en fachada.',
  'Finca rústica de 2 hectáreas con olivar en producción. Acceso por camino rural. Valla perimetral.',
  'Nave industrial de 400m² en polígono industrial. Puerta de acceso para camiones. Oficina y servicios. Cubierta a dos aguas.',
  'Vehículo BMW 320d, año 2021, 45.000km. Estado: buen estado. Motor diésel 2.0, cambio automático.',
  'Apartamento de 65m², dos habitaciones, baño, cocina americana, terraza. Zona turística, cerca de la playa.',
];

const calles = [
  'Calle Gran Vía', 'Avenida de la Constitución', 'Calle Mayor', 'Paseo de la Castellana',
  'Rambla de Cataluña', 'Calle Alcalá', 'Avenida del Puerto', 'Calle Serrano',
  'Paseo Marítimo', 'Calle Larios', 'Avenida de América', 'Plaza del Sol',
];

const now = new Date();
const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO auctions 
  (source, source_id, tipo_bien, provincia, municipio, direccion, valor_subasta, puja_minima, 
   puja_actual, fecha_inicio, fecha_fin, estado, descripcion, organismo, url_detalle, 
   referencia_catastral, lat, lng, imagen_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let count = 0;
for (let i = 0; i < 500; i++) {
  const provincia = provincias[i % provincias.length];
  const municipios = municipiosPorProvincia[provincia] || [provincia];
  const municipio = municipios[Math.floor(Math.random() * municipios.length)];
  const tipo = tipos[Math.floor(Math.random() * tipos.length)];
  const source = fuentes[Math.floor(Math.random() * fuentes.length)];
  
  let precioBase: number;
  switch (tipo) {
    case 'Vivienda': precioBase = 50000 + Math.random() * 300000; break;
    case 'Garaje': precioBase = 5000 + Math.random() * 20000; break;
    case 'Solar': precioBase = 20000 + Math.random() * 150000; break;
    case 'Finca rústica': precioBase = 15000 + Math.random() * 80000; break;
    case 'Local comercial': precioBase = 30000 + Math.random() * 200000; break;
    case 'Nave industrial': precioBase = 40000 + Math.random() * 250000; break;
    case 'Vehículo': precioBase = 3000 + Math.random() * 30000; break;
    default: precioBase = 10000 + Math.random() * 50000;
  }
  
  const pujaMinima = precioBase * 0.5;
  const tienePuja = Math.random() > 0.4;
  const pujaActual = tienePuja ? pujaMinima + Math.random() * (precioBase * 0.3) : null;
  
  const diasInicio = Math.floor(Math.random() * 30);
  const diasFin = 5 + Math.floor(Math.random() * 60);
  const fechaInicio = new Date(now.getTime() - diasInicio * 86400000);
  const fechaFin = new Date(now.getTime() + diasFin * 86400000);
  
  const estado = diasFin > 0 ? 'activa' : 'finalizada';
  const calle = calles[Math.floor(Math.random() * calles.length)];
  const numero = 1 + Math.floor(Math.random() * 100);
  const descripcion = descripciones[Math.floor(Math.random() * descripciones.length)];
  const organismo = organismos[Math.floor(Math.random() * organismos.length)];
  
  const sourceId = `${source}-${2024 + Math.floor(Math.random() * 2)}-${String(i).padStart(5, '0')}`;
  const refCat = `${Math.floor(Math.random() * 99999999).toString().padStart(8, '0')}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}J`;
  
  // Approximate lat/lng for Spain
  const lat = 36.5 + Math.random() * 6;
  const lng = -7 + Math.random() * 10;
  
  insertStmt.run(
    source, sourceId, tipo, provincia, municipio,
    `${calle}, ${numero}, ${municipio}`,
    Math.round(precioBase * 100) / 100,
    Math.round(pujaMinima * 100) / 100,
    pujaActual ? Math.round(pujaActual * 100) / 100 : null,
    fechaInicio.toISOString().split('T')[0],
    fechaFin.toISOString().split('T')[0],
    estado,
    descripcion,
    organismo,
    source === 'boe' ? `https://subastas.boe.es/detail.php?id=${sourceId}` :
      source === 'hacienda' ? `https://apcfacturacion.sedeagenciatributaria.gob.es/Subastas/${sourceId}` :
      `https://subastas.seg-social.es/${sourceId}`,
    refCat,
    lat, lng,
    null
  );
  count++;
}

console.log(`Seeded ${count} auctions`);

// Stats
const stats = db.prepare('SELECT estado, COUNT(*) as c FROM auctions GROUP BY estado').all();
console.log('Stats:', stats);

db.close();
