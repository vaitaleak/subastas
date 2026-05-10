import Database from 'better-sqlite3';
import path from 'path';
import type { Auction, Alert, AuctionFilters, ScrapedAuction } from './types';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'subastas.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initializeSchema(_db);
  }
  return _db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      titulo TEXT,
      tipo_bien TEXT,
      provincia TEXT,
      municipio TEXT,
      direccion TEXT,
      valor_subasta REAL,
      puja_minima REAL,
      puja_actual REAL,
      fecha_inicio TEXT,
      fecha_fin TEXT,
      estado TEXT,
      descripcion TEXT,
      organismo TEXT,
      url_detalle TEXT,
      referencia_catastral TEXT,
      cargas TEXT,
      lat REAL,
      lng REAL,
      imagen_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source, source_id)
    );

    CREATE INDEX IF NOT EXISTS idx_auctions_source ON auctions(source);
    CREATE INDEX IF NOT EXISTS idx_auctions_provincia ON auctions(provincia);
    CREATE INDEX IF NOT EXISTS idx_auctions_tipo_bien ON auctions(tipo_bien);
    CREATE INDEX IF NOT EXISTS idx_auctions_fecha_fin ON auctions(fecha_fin);
    CREATE INDEX IF NOT EXISTS idx_auctions_estado ON auctions(estado);
    CREATE INDEX IF NOT EXISTS idx_auctions_valor_subasta ON auctions(valor_subasta);

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      filtros_json TEXT NOT NULL,
      activa INTEGER DEFAULT 1,
      token_verificacion TEXT,
      verificada INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      nombre TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      auction_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (auction_id) REFERENCES auctions(id),
      UNIQUE(user_id, auction_id)
    );
  `);
}

// --- Upsert a single auction (insert or update) ---
export function upsertAuction(auction: ScrapedAuction): { inserted: boolean; updated: boolean } {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db.prepare(
    `SELECT id, puja_actual, estado, valor_subasta, puja_minima FROM auctions WHERE source = ? AND source_id = ?`
  ).get(auction.source, auction.source_id) as { id: number; puja_actual: number | null; estado: string; valor_subasta: number | null; puja_minima: number | null } | undefined;

  if (existing) {
    // Only update if something changed
    const updates: string[] = [];
    const values: any[] = [];

    const fields: Record<string, any> = {
      titulo: auction.titulo,
      tipo_bien: auction.tipo_bien,
      provincia: auction.provincia,
      municipio: auction.municipio,
      direccion: auction.direccion,
      valor_subasta: auction.valor_subasta,
      puja_minima: auction.puja_minima,
      puja_actual: auction.puja_actual,
      fecha_inicio: auction.fecha_inicio,
      fecha_fin: auction.fecha_fin,
      estado: auction.estado,
      descripcion: auction.descripcion,
      organismo: auction.organismo,
      url_detalle: auction.url_detalle,
      referencia_catastral: auction.referencia_catastral,
      cargas: auction.cargas,
      lat: auction.lat,
      lng: auction.lng,
      imagen_url: auction.imagen_url,
      updated_at: now,
    };

    for (const [key, value] of Object.entries(fields)) {
      if (key === 'updated_at') {
        updates.push(`${key} = ?`);
        values.push(value);
        continue;
      }
      if (value !== null && value !== undefined && value !== '') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length > 0) {
      values.push(existing.id);
      db.prepare(`UPDATE auctions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      return { inserted: false, updated: true };
    }
    return { inserted: false, updated: false };
  }

  // Insert new
  db.prepare(`
    INSERT INTO auctions (source, source_id, titulo, tipo_bien, provincia, municipio,
      direccion, valor_subasta, puja_minima, puja_actual, fecha_inicio, fecha_fin,
      estado, descripcion, organismo, url_detalle, referencia_catastral, cargas,
      lat, lng, imagen_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    auction.source, auction.source_id, auction.titulo, auction.tipo_bien,
    auction.provincia, auction.municipio, auction.direccion, auction.valor_subasta,
    auction.puja_minima, auction.puja_actual, auction.fecha_inicio, auction.fecha_fin,
    auction.estado, auction.descripcion, auction.organismo, auction.url_detalle,
    auction.referencia_catastral, auction.cargas, auction.lat, auction.lng,
    auction.imagen_url, now, now
  );
  return { inserted: true, updated: false };
}

// --- Get auctions with filters and pagination ---
export function getAuctions(filters: AuctionFilters = {}): { auctions: Auction[]; total: number; page: number; totalPages: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.provincia) {
    conditions.push('provincia LIKE ?');
    params.push(`%${filters.provincia}%`);
  }
  if (filters.tipo_bien) {
    conditions.push('tipo_bien LIKE ?');
    params.push(`%${filters.tipo_bien}%`);
  }
  if (filters.precio_min !== undefined) {
    conditions.push('valor_subasta >= ?');
    params.push(filters.precio_min);
  }
  if (filters.precio_max !== undefined) {
    conditions.push('valor_subasta <= ?');
    params.push(filters.precio_max);
  }
  if (filters.query) {
    conditions.push('(titulo LIKE ? OR descripcion LIKE ? OR municipio LIKE ? OR organismo LIKE ?)');
    const q = `%${filters.query}%`;
    params.push(q, q, q, q);
  }
  if (filters.source) {
    conditions.push('source = ?');
    params.push(filters.source);
  }
  if (filters.estado) {
    conditions.push('estado LIKE ?');
    params.push(`%${filters.estado}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 20;
  const page = filters.page || 1;
  const offset = (page - 1) * limit;

  const sortMap: Record<string, string> = {
    'precio_asc': 'valor_subasta ASC',
    'precio_desc': 'valor_subasta DESC',
    'fecha_fin_asc': 'fecha_fin ASC',
    'fecha_fin_desc': 'fecha_fin DESC',
    'fecha_inicio_desc': 'fecha_inicio DESC',
    'created_at_desc': 'created_at DESC',
    'updated_at_desc': 'updated_at DESC',
  };
  const orderBy = sortMap[filters.sort || 'created_at_desc'] || 'created_at DESC';

  const totalResult = db.prepare(`SELECT COUNT(*) as count FROM auctions ${where}`).get(...params) as { count: number };
  const total = totalResult.count;

  const auctions = db.prepare(
    `SELECT * FROM auctions ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Auction[];

  return {
    auctions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// --- Get single auction by internal ID ---
export function getAuctionById(id: number): Auction | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM auctions WHERE id = ?').get(id) as Auction | undefined;
}

// --- Full-text search ---
export function searchAuctions(query: string, limit = 20): Auction[] {
  const db = getDb();
  const q = `%${query}%`;
  return db.prepare(`
    SELECT * FROM auctions
    WHERE titulo LIKE ? OR descripcion LIKE ? OR municipio LIKE ?
      OR provincia LIKE ? OR organismo LIKE ? OR direccion LIKE ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(q, q, q, q, q, q, limit) as Auction[];
}

// --- Get auctions created after a given date (for alerts) ---
export function getAuctionsCreatedAfter(date: string, filters?: Record<string, any>): Auction[] {
  const db = getDb();
  const conditions = ['created_at > ?'];
  const params: any[] = [date];

  if (filters?.provincia) {
    conditions.push('provincia LIKE ?');
    params.push(`%${filters.provincia}%`);
  }
  if (filters?.tipo_bien) {
    conditions.push('tipo_bien LIKE ?');
    params.push(`%${filters.tipo_bien}%`);
  }
  if (filters?.precio_min) {
    conditions.push('valor_subasta >= ?');
    params.push(filters.precio_min);
  }
  if (filters?.precio_max) {
    conditions.push('valor_subasta <= ?');
    params.push(filters.precio_max);
  }
  if (filters?.query) {
    conditions.push('(titulo LIKE ? OR descripcion LIKE ?)');
    params.push(`%${filters.query}%`, `%${filters.query}%`);
  }

  return db.prepare(
    `SELECT * FROM auctions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`
  ).all(...params) as Auction[];
}

// --- Alert helpers ---
export function createAlert(email: string, filtros: Record<string, any>): Alert {
  const db = getDb();
  const token = crypto.randomUUID();
  const filtrosJson = JSON.stringify(filtros);
  const result = db.prepare(
    `INSERT INTO alerts (email, filtros_json, activa, token_verificacion, verificada) VALUES (?, ?, 1, ?, 1)`
  ).run(email, filtrosJson, token);
  return {
    id: Number(result.lastInsertRowid),
    email,
    filtros_json: filtrosJson,
    activa: 1,
    token_verificacion: token,
    verificada: 1,
  };
}

export function deleteAlert(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getActiveAlerts(): Alert[] {
  const db = getDb();
  return db.prepare('SELECT * FROM alerts WHERE activa = 1 AND verificada = 1').all() as Alert[];
}

export function verifyAlert(token: string): boolean {
  const db = getDb();
  const result = db.prepare('UPDATE alerts SET verificada = 1 WHERE token_verificacion = ?').run(token);
  return result.changes > 0;
}

// --- Mark auctions as closed if their fecha_fin has passed ---
export function markClosedAuctions(): number {
  const db = getDb();
  const now = new Date().toISOString().slice(0, 10);
  const result = db.prepare(
    `UPDATE auctions SET estado = 'celebrada/cerrada', updated_at = datetime('now') WHERE fecha_fin < ? AND estado NOT LIKE '%cerrada%' AND estado NOT LIKE '%celebrada%'`
  ).run(now);
  return result.changes;
}
