// Province center coordinates for all 52 Spanish provinces
const PROVINCE_CENTERS: Record<string, { lat: number; lng: number }> = {
  'Álava': { lat: 42.85, lng: -2.67 },
  'Albacete': { lat: 38.99, lng: -1.86 },
  'Alicante': { lat: 38.35, lng: -0.48 },
  'Almería': { lat: 36.84, lng: -2.46 },
  'Ávila': { lat: 40.66, lng: -4.70 },
  'Badajoz': { lat: 38.88, lng: -6.97 },
  'Baleares': { lat: 39.57, lng: 2.65 },
  'Barcelona': { lat: 41.39, lng: 2.17 },
  'Burgos': { lat: 42.35, lng: -3.69 },
  'Cáceres': { lat: 39.47, lng: -6.37 },
  'Cádiz': { lat: 36.51, lng: -6.27 },
  'Castellón': { lat: 39.98, lng: -0.05 },
  'Ciudad Real': { lat: 38.99, lng: -3.92 },
  'Córdoba': { lat: 37.89, lng: -4.78 },
  'Coruña': { lat: 43.37, lng: -8.41 },
  'Cuenca': { lat: 40.07, lng: -2.13 },
  'Girona': { lat: 41.98, lng: 2.82 },
  'Granada': { lat: 37.18, lng: -3.60 },
  'Guadalajara': { lat: 40.63, lng: -3.16 },
  'Guipúzcoa': { lat: 43.07, lng: -2.11 },
  'Huelva': { lat: 37.26, lng: -6.94 },
  'Huesca': { lat: 42.14, lng: -0.41 },
  'Jaén': { lat: 37.77, lng: -3.79 },
  'León': { lat: 42.60, lng: -5.57 },
  'Lleida': { lat: 41.62, lng: 0.62 },
  'Rioja': { lat: 42.29, lng: -2.54 },
  'Lugo': { lat: 43.01, lng: -7.56 },
  'Madrid': { lat: 40.42, lng: -3.70 },
  'Málaga': { lat: 36.72, lng: -4.42 },
  'Murcia': { lat: 37.99, lng: -1.13 },
  'Navarra': { lat: 42.67, lng: -1.64 },
  'Ourense': { lat: 42.34, lng: -7.86 },
  'Asturias': { lat: 43.36, lng: -5.84 },
  'Palencia': { lat: 42.01, lng: -4.53 },
  'Las Palmas': { lat: 28.12, lng: -15.43 },
  'Pontevedra': { lat: 42.43, lng: -8.64 },
  'Salamanca': { lat: 40.96, lng: -5.67 },
  'Santa Cruz de Tenerife': { lat: 28.46, lng: -16.25 },
  'Cantabria': { lat: 43.18, lng: -3.98 },
  'Segovia': { lat: 40.95, lng: -4.14 },
  'Sevilla': { lat: 37.39, lng: -5.99 },
  'Soria': { lat: 41.77, lng: -2.47 },
  'Tarragona': { lat: 41.12, lng: 1.26 },
  'Teruel': { lat: 40.35, lng: -1.11 },
  'Toledo': { lat: 39.86, lng: -4.03 },
  'Valencia': { lat: 39.47, lng: -0.38 },
  'Valladolid': { lat: 41.65, lng: -4.72 },
  'Bizkaia': { lat: 43.26, lng: -2.93 },
  'Zamora': { lat: 41.50, lng: -5.75 },
  'Zaragoza': { lat: 41.65, lng: -0.88 },
  'Ceuta': { lat: 35.89, lng: -5.31 },
  'Melilla': { lat: 35.29, lng: -2.94 },
};

// Normalize province name for matching (handle accents, casing, etc.)
function normalizeProvince(name: string): string {
  const n = name.trim().toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n');

  for (const key of Object.keys(PROVINCE_CENTERS)) {
    const k = key.toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n');
    if (k === n) return key;
  }

  // Try partial match
  for (const key of Object.keys(PROVINCE_CENTERS)) {
    const k = key.toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n');
    if (k.includes(n) || n.includes(k)) return key;
  }

  return name;
}

/**
 * Get the center coordinates for a province
 */
export function getProvinceCenter(provincia: string): { lat: number; lng: number } | null {
  if (!provincia) return null;
  const normalized = normalizeProvince(provincia);
  return PROVINCE_CENTERS[normalized] || null;
}

/**
 * Estimate coordinates for a municipality within a province.
 * Uses the province center and adds a small random offset so markers don't overlap.
 */
export function estimateCoordinates(provincia: string, municipio: string): { lat: number; lng: number } {
  const center = getProvinceCenter(provincia);

  if (!center) {
    // Fallback: center of Spain
    return { lat: 40.0 + (Math.random() - 0.5) * 2, lng: -3.7 + (Math.random() - 0.5) * 2 };
  }

  // Generate a deterministic but spread offset based on municipio name hash
  let hash = 0;
  for (let i = 0; i < municipio.length; i++) {
    const char = municipio.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use the hash to create a spread within ~0.3 degrees (~30km radius)
  const angle = ((hash & 0xFFFF) / 0xFFFF) * Math.PI * 2;
  const radius = 0.05 + (((hash >> 16) & 0xFFFF) / 0xFFFF) * 0.25;

  return {
    lat: center.lat + Math.cos(angle) * radius,
    lng: center.lng + Math.sin(angle) * radius,
  };
}

/**
 * Get coordinates for an auction - use lat/lng if available, otherwise estimate
 */
export function getAuctionCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
  provincia: string,
  municipio: string
): { lat: number; lng: number } | null {
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    return { lat, lng };
  }

  if (provincia || municipio) {
    return estimateCoordinates(provincia || '', municipio || '');
  }

  return null;
}
