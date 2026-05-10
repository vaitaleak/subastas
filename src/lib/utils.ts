import { Auction } from './types';

// ─── Normalize string for comparison ────────────────────────────────────────
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .trim();
}

// ─── Price formatting ───────────────────────────────────────────────────────
export function formatPrice(num: number | null | undefined): string {
  if (num == null) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// ─── Date formatting ────────────────────────────────────────────────────────
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Time remaining ─────────────────────────────────────────────────────────
export function getTimeRemaining(endDate: string | Date): string {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Finalizada';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 1) return `Faltan ${days} días`;
  if (days === 1) return 'Falta 1 día';
  if (hours > 1) return `Faltan ${hours} horas`;
  if (hours === 1) return 'Falta 1 hora';
  return `Faltan ${minutes} min`;
}

export function isEndingSoon(endDate: string | Date): boolean {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diff = end.getTime() - Date.now();
  return diff > 0 && diff < 1000 * 60 * 60 * 24 * 2; // less than 2 days
}

// ─── Provinces ──────────────────────────────────────────────────────────────
const PROVINCES: Record<string, string> = {
  '01': 'Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería',
  '05': 'Ávila', '06': 'Badajoz', '07': 'Baleares', '08': 'Barcelona',
  '09': 'Burgos', '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón',
  '13': 'Ciudad Real', '14': 'Córdoba', '15': 'Coruña', '16': 'Cuenca',
  '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Guipúzcoa',
  '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León',
  '25': 'Lleida', '26': 'Rioja', '27': 'Lugo', '28': 'Madrid',
  '29': 'Málaga', '30': 'Murcia', '31': 'Navarra', '32': 'Ourense',
  '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas', '36': 'Pontevedra',
  '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria',
  '40': 'Segovia', '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona',
  '44': 'Teruel', '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid',
  '48': 'Bizkaia', '49': 'Zamora', '50': 'Zaragoza', '51': 'Ceuta',
  '52': 'Melilla',
};

export function getProvinceName(code: string): string {
  return PROVINCES[code] || code;
}

export const PROVINCE_LIST = Object.entries(PROVINCES).map(([code, name]) => ({ code, name }));

// ─── Tipo de bien ───────────────────────────────────────────────────────────
// Data values are the display names (e.g. "Vivienda", "Vehículo", "Finca rústica")
const TIPO_BIEN: Record<string, string> = {
  vivienda: 'Vivienda',
  garaje: 'Garaje',
  solar: 'Solar',
  finca_rustica: 'Finca rústica',
  local: 'Local comercial',
  nave: 'Nave industrial',
  vehiculo: 'Vehículo',
  oficina: 'Oficina',
  trastero: 'Trastero',
  nave_almacen: 'Nave/Almacén',
  other: 'Otro',
};

export function getTipoBienLabel(tipo: string): string {
  // tipo may already be the display name from data.json
  if (TIPO_BIEN[tipo]) return TIPO_BIEN[tipo];
  // Check if it's a display name already (return as-is)
  return tipo;
}

// Return list with display names as values (matching data.json values)
export const TIPO_BIEN_LIST = Object.entries(TIPO_BIEN).map(([value, label]) => ({ value, label }));

// ─── Match tipo_bien with normalization ──────────────────────────────────────
export function matchTipoBien(auctionTipo: string, filterTipo: string): boolean {
  // Exact match first
  if (auctionTipo === filterTipo) return true;
  // Normalize both sides
  return normalize(auctionTipo) === normalize(filterTipo);
}

// ─── Source ─────────────────────────────────────────────────────────────────
const SOURCES: Record<string, string> = {
  judicial: 'BOE Judicial',
  hacienda: 'Agencia Tributaria',
  seguridad_social: 'Seguridad Social',
};

export function getSourceLabel(source: string): string {
  return SOURCES[source] || source;
}

export const SOURCE_LIST = Object.entries(SOURCES).map(([value, label]) => ({ value, label }));

// ─── Estado ─────────────────────────────────────────────────────────────────
export function getEstadoBadge(estado: string): { text: string; color: string; bg: string } {
  switch (estado?.toLowerCase()) {
    case 'activa':
      return { text: 'Activa', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' };
    case 'finalizada':
      return { text: 'Finalizada', color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20' };
    case 'proxima':
      return { text: 'Próxima', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' };
    case 'suspendida':
      return { text: 'Suspendida', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' };
    default:
      return { text: estado, color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20' };
  }
}

// ─── Build query string ─────────────────────────────────────────────────────
export function buildQueryString(params: Record<string, string | number | undefined | null>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v != null && v !== '' && v !== 0)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

// ─── Debounce ───────────────────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// ─── Icon for tipo_bien ─────────────────────────────────────────────────────
export function getTipoBienIcon(tipo: string): string {
  const n = normalize(tipo);
  const icons: Record<string, string> = {
    vivienda: '🏠',
    garaje: '🅿️',
    solar: '🏗️',
    'finca rustica': '🌾',
    'finca rústica': '🌾',
    'local comercial': '🏪',
    local: '🏪',
    'nave industrial': '🏭',
    nave: '🏭',
    vehiculo: '🚗',
    'vehículo': '🚗',
    oficina: '🏢',
    trastero: '📦',
    'nave/almacen': '🏭',
    'nave/almacén': '🏭',
  };
  return icons[tipo] || icons[n] || '📋';
}

// ─── Truncate text ──────────────────────────────────────────────────────────
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

// ─── Auction title builder ──────────────────────────────────────────────────
export function getAuctionTitle(auction: Auction): string {
  const tipo = getTipoBienLabel(auction.tipo_bien);
  const loc = auction.municipio || auction.provincia || '';
  if (auction.direccion && auction.direccion.length < 60) {
    return `${tipo} en ${auction.direccion}, ${loc}`;
  }
  return `${tipo} en ${loc}`;
}

// ─── Number with dots (for counters) ───────────────────────────────────────
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-ES').format(n);
}
