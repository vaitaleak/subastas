import * as cheerio from 'cheerio';
import type { ScrapedAuction, AuctionSource } from '../types';

const SOURCE: AuctionSource = 'boe';
const BASE_URL = 'https://subastas.boe.es';
const LIST_URL = `${BASE_URL}/subastas.php`;
const DETAIL_URL = `${BASE_URL}/subasta.php`;
const RATE_LIMIT_MS = 1100; // ~1 request per second

let lastRequestTime = 0;

async function rateLimitedFetch(url: string, retries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const elapsed = Date.now() - lastRequestTime;
      if (elapsed < RATE_LIMIT_MS) {
        await sleep(RATE_LIMIT_MS - elapsed);
      }
      lastRequestTime = Date.now();

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SubastasBot/1.0 (Spanish Public Auctions Aggregator; +https://example.com/bot)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (response.status === 429) {
        console.warn(`[BOE] Rate limited on attempt ${attempt}, waiting longer...`);
        await sleep(5000 * attempt);
        continue;
      }

      if (!response.ok) {
        console.warn(`[BOE] HTTP ${response.status} for ${url}`);
        if (response.status >= 500) {
          await sleep(2000 * attempt);
          continue;
        }
        return null;
      }

      return await response.text();
    } catch (err: any) {
      console.error(`[BOE] Fetch error attempt ${attempt} for ${url}: ${err.message}`);
      if (attempt < retries) await sleep(2000 * attempt);
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseMoney(text: string): number | null {
  if (!text) return null;
  // Spanish format: 123.456,78 € or 123,456.78 €
  const cleaned = text.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return null;
  // Handle Spanish locale: 1.234,56
  const withDotDecimal = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(withDotDecimal);
  return isNaN(num) ? null : num;
}

function parseDate(text: string): string | null {
  if (!text) return null;
  // Try DD/MM/YYYY or DD-MM-YYYY
  const match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Try YYYY-MM-DD
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  return null;
}

function safeText($: cheerio.CheerioAPI, el: cheerio.Element | cheerio.AnyNode | null, fallback = ''): string {
  if (!el) return fallback;
  return $(el).text().trim() || fallback;
}

// --- Scrape list pages ---
export async function scrapeBoeList(maxPages = 10): Promise<ScrapedAuction[]> {
  const auctions: ScrapedAuction[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `${LIST_URL}?page=${page}&tipo=subastas&estado=pendiente&order=fecha_inicio+desc`;
      console.log(`[BOE] Scraping list page ${page}: ${url}`);

      const html = await rateLimitedFetch(url);
      if (!html) {
        console.warn(`[BOE] No HTML returned for page ${page}, stopping.`);
        break;
      }

      const $ = cheerio.load(html);
      const rows = $('table.tablaSubastas tbody tr, table.listado tbody tr, div.resultados-busqueda table tbody tr');

      if (rows.length === 0) {
        // Try alternative selectors - BOE may change their HTML structure
        const altRows = $('table tbody tr, table.results tbody tr, .list-subastas .item, div.subasta-item');
        if (altRows.length === 0) {
          // Check for generic result containers
          const genericResults = $('div.resultado, article.subasta, .auction-item, [data-id-subasta]');
          if (genericResults.length === 0) {
            console.warn(`[BOE] No auction rows found on page ${page}. May have reached end or structure changed.`);
            // Don't break - try one more page
            if (page > 1 && rows.length === 0) break;
          }
          genericResults.each((_, el) => {
            try {
              const auction = parseGenericAuction($, $(el));
              if (auction.source_id) auctions.push(auction);
            } catch (e) {
              console.error('[BOE] Error parsing generic result:', e);
            }
          });
          if (genericResults.length > 0) continue;
        }
      }

      let foundAny = false;
      rows.each((_, row) => {
        try {
          const cells = $(row).find('td');
          if (cells.length < 3) return;

          const linkEl = $(row).find('a[href*="subasta"], a[href*="id_subasta"]').first();
          const href = linkEl.attr('href') || '';
          const sourceIdMatch = href.match(/id_subasta=(\d+)/) || href.match(/id=(\d+)/) || href.match(/subasta\.php\?id=(\d+)/);
          const sourceId = sourceIdMatch ? sourceIdMatch[1] : '';

          if (!sourceId) return;

          const titulo = linkEl.text().trim() || safeText($, cells[0]);
          const tipoBien = cells.length > 1 ? safeText($, cells[1]) : '';
          const provincia = cells.length > 2 ? safeText($, cells[2]) : '';
          const municipio = cells.length > 3 ? safeText($, cells[3]) : '';
          const valorSubastaText = cells.length > 4 ? safeText($, cells[4]) : '';
          const fechaInicioText = cells.length > 5 ? safeText($, cells[5]) : '';
          const fechaFinText = cells.length > 6 ? safeText($, cells[6]) : '';
          const estadoText = cells.length > 7 ? safeText($, cells[7]) : 'pendiente';
          const organismoText = cells.length > 8 ? safeText($, cells[8]) : '';

          const urlDetalle = href.startsWith('http') ? href : `${BASE_URL}/${href.replace(/^\//, '')}`;

          auctions.push({
            source: SOURCE,
            source_id: sourceId,
            titulo,
            tipo_bien: tipoBien,
            provincia,
            municipio,
            direccion: '',
            valor_subasta: parseMoney(valorSubastaText),
            puja_minima: null,
            puja_actual: null,
            fecha_inicio: parseDate(fechaInicioText),
            fecha_fin: parseDate(fechaFinText),
            estado: estadoText || 'pendiente',
            descripcion: '',
            organismo: organismoText,
            url_detalle: urlDetalle,
            referencia_catastral: '',
            cargas: '',
            lat: null,
            lng: null,
            imagen_url: '',
          });
          foundAny = true;
        } catch (err) {
          console.error('[BOE] Error parsing row:', err);
        }
      });

      if (!foundAny && page > 1) {
        console.log(`[BOE] No results on page ${page}, stopping pagination.`);
        break;
      }

      console.log(`[BOE] Page ${page}: found ${rows.length} rows, total auctions so far: ${auctions.length}`);
    } catch (err) {
      console.error(`[BOE] Error on list page ${page}:`, err);
      break;
    }
  }

  return auctions;
}

function parseGenericAuction($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): ScrapedAuction {
  const sourceId = el.attr('data-id-subasta') || el.attr('data-id') || '';
  const linkEl = el.find('a[href*="subasta"], a[href*="id="]').first();
  const href = linkEl.attr('href') || '';
  const extractedId = href.match(/id_subasta=(\d+)/)?.[1] || href.match(/id=(\d+)/)?.[1] || sourceId;

  return {
    source: SOURCE,
    source_id: extractedId,
    titulo: linkEl.text().trim() || el.find('h2, h3, .titulo, .title').first().text().trim(),
    tipo_bien: el.find('.tipo, .tipo-bien, [data-field="tipo"]').first().text().trim(),
    provincia: el.find('.provincia, [data-field="provincia"]').first().text().trim(),
    municipio: el.find('.municipio, [data-field="municipio"]').first().text().trim(),
    direccion: '',
    valor_subasta: parseMoney(el.find('.precio, .valor, [data-field="valor"]').first().text()),
    puja_minima: null,
    puja_actual: null,
    fecha_inicio: parseDate(el.find('.fecha-inicio, [data-field="fecha_inicio"]').first().text()),
    fecha_fin: parseDate(el.find('.fecha-fin, [data-field="fecha_fin"]').first().text()),
    estado: el.find('.estado, [data-field="estado"]').first().text().trim() || 'pendiente',
    descripcion: '',
    organismo: el.find('.organismo, .juzgado, [data-field="organismo"]').first().text().trim(),
    url_detalle: href.startsWith('http') ? href : (href ? `${BASE_URL}/${href.replace(/^\//, '')}` : ''),
    referencia_catastral: '',
    cargas: '',
    lat: null,
    lng: null,
    imagen_url: el.find('img').first().attr('src') || '',
  };
}

// --- Scrape detail page for extra info ---
export async function scrapeBoeDetail(auction: ScrapedAuction): Promise<ScrapedAuction> {
  if (!auction.url_detalle) return auction;

  try {
    const html = await rateLimitedFetch(auction.url_detalle);
    if (!html) return auction;

    const $ = cheerio.load(html);

    // Description
    const descEl = $('#textoDetalleSubasta, .descripcion-subasta, .detalle .descripcion, [data-field="descripcion"]');
    if (descEl.length) {
      auction.descripcion = descEl.text().trim().slice(0, 5000);
    }

    // Direccion
    const dirEl = $('[data-field="direccion"], .direccion-subasta, th:contains("Dirección") + td, th:contains("Direccion") + td');
    if (dirEl.length) {
      auction.direccion = dirEl.first().text().trim();
    }

    // Referencia catastral
    const refCatEl = $('[data-field="referencia_catastral"], th:contains("Referencia catastral") + td, th:contains("ref. catastral") + td, .ref-catastral');
    if (refCatEl.length) {
      auction.referencia_catastral = refCatEl.first().text().trim();
    }

    // Cargas
    const cargasEl = $('[data-field="cargas"], th:contains("Cargas") + td, .cargas-subasta');
    if (cargasEl.length) {
      auction.cargas = cargasEl.first().text().trim();
    }

    // Puja actual
    const pujaEl = $('[data-field="puja_actual"], th:contains("Puja") + td, .puja-actual, .valor-puja');
    if (pujaEl.length) {
      auction.puja_actual = parseMoney(pujaEl.first().text());
    }

    // Puja minima
    const pujaMinEl = $('[data-field="puja_minima"], th:contains("puja mínima") + td, th:contains("Puja minima") + td');
    if (pujaMinEl.length) {
      auction.puja_minima = parseMoney(pujaMinEl.first().text());
    }

    // Valor subasta (if not already set)
    if (!auction.valor_subasta) {
      const valorEl = $('[data-field="valor_subasta"], th:contains("Valor de subasta") + td, th:contains("valor subasta") + td, .valor-subasta');
      if (valorEl.length) {
        auction.valor_subasta = parseMoney(valorEl.first().text());
      }
    }

    // Image
    const imgEl = $('.detalle img, .imagen-subasta img, #imagenSubasta');
    if (imgEl.length) {
      const src = imgEl.first().attr('src') || '';
      auction.imagen_url = src.startsWith('http') ? src : (src ? `${BASE_URL}/${src.replace(/^\//, '')}` : auction.imagen_url);
    }

    // Dates (if not already set)
    if (!auction.fecha_inicio) {
      const fiEl = $('th:contains("Fecha inicio") + td, [data-field="fecha_inicio"]');
      if (fiEl.length) auction.fecha_inicio = parseDate(fiEl.first().text());
    }
    if (!auction.fecha_fin) {
      const ffEl = $('th:contains("Fecha fin") + td, th:contains("Fecha conclus") + td, [data-field="fecha_fin"]');
      if (ffEl.length) auction.fecha_fin = parseDate(ffEl.first().text());
    }

    // Organismo
    if (!auction.organismo) {
      const orgEl = $('th:contains("Organismo") + td, th:contains("Juzgado") + td, .organismo');
      if (orgEl.length) auction.organismo = orgEl.first().text().trim();
    }

    console.log(`[BOE] Detail scraped for ${auction.source_id}: ${auction.direccion || 'no dir'}, desc=${auction.descripcion ? auction.descripcion.length : 0} chars`);
  } catch (err) {
    console.error(`[BOE] Error scraping detail for ${auction.source_id}:`, err);
  }

  return auction;
}

// --- Main entry point ---
export async function scrapeBoe(options: { maxPages?: number; scrapeDetails?: boolean } = {}): Promise<{
  auctions: ScrapedAuction[];
  errors: string[];
}> {
  const errors: string[] = [];
  let auctions: ScrapedAuction[] = [];

  console.log('[BOE] Starting scrape...');

  try {
    auctions = await scrapeBoeList(options.maxPages || 10);
    console.log(`[BOE] List scrape complete: ${auctions.length} auctions found`);
  } catch (err: any) {
    errors.push(`List scrape error: ${err.message}`);
    console.error('[BOE] Fatal list scrape error:', err);
  }

  if (options.scrapeDetails !== false && auctions.length > 0) {
    console.log(`[BOE] Scraping details for ${Math.min(auctions.length, 100)} auctions...`);
    const toDetail = auctions.slice(0, 100); // Limit to avoid overwhelming

    for (let i = 0; i < toDetail.length; i++) {
      try {
        toDetail[i] = await scrapeBoeDetail(toDetail[i]);
      } catch (err: any) {
        errors.push(`Detail error for ${toDetail[i].source_id}: ${err.message}`);
      }
    }

    // Merge detailed info back
    for (let i = 0; i < Math.min(auctions.length, toDetail.length); i++) {
      auctions[i] = toDetail[i];
    }
  }

  console.log(`[BOE] Scrape complete: ${auctions.length} auctions, ${errors.length} errors`);
  return { auctions, errors };
}

// Allow direct execution
if (typeof require !== 'undefined' && require.main === module) {
  scrapeBoe({ maxPages: 3, scrapeDetails: true }).then(({ auctions, errors }) => {
    console.log(`\n=== BOE SCRAPER RESULTS ===`);
    console.log(`Auctions: ${auctions.length}`);
    console.log(`Errors: ${errors.length}`);
    if (auctions.length > 0) {
      console.log('\nSample auction:', JSON.stringify(auctions[0], null, 2));
    }
  }).catch(console.error);
}
