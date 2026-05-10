import * as cheerio from 'cheerio';
import type { ScrapedAuction, AuctionSource } from '../types';

const SOURCE: AuctionSource = 'hacienda';
const BASE_URL = 'https://apcfacturacion.sedeagenciatributaria.gob.es';
const LIST_URL = `${BASE_URL}/Subastas/ConsultaSubastas.aspx`;
const RATE_LIMIT_MS = 1100;

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
        console.warn(`[Hacienda] Rate limited on attempt ${attempt}`);
        await sleep(5000 * attempt);
        continue;
      }

      if (!response.ok) {
        console.warn(`[Hacienda] HTTP ${response.status} for ${url}`);
        if (response.status >= 500) {
          await sleep(2000 * attempt);
          continue;
        }
        return null;
      }

      return await response.text();
    } catch (err: any) {
      console.error(`[Hacienda] Fetch error attempt ${attempt}: ${err.message}`);
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
  const cleaned = text.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return null;
  const withDotDecimal = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(withDotDecimal);
  return isNaN(num) ? null : num;
}

function parseDate(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  return isoMatch ? isoMatch[1] : null;
}

// --- Scrape list pages from Hacienda ---
async function scrapeHaciendaList(maxPages = 10): Promise<ScrapedAuction[]> {
  const auctions: ScrapedAuction[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = page === 1
        ? LIST_URL
        : `${BASE_URL}/Subastas/ConsultaSubastas.aspx?page=${page}`;

      console.log(`[Hacienda] Scraping list page ${page}: ${url}`);
      const html = await rateLimitedFetch(url);
      if (!html) {
        console.warn(`[Hacienda] No HTML for page ${page}, stopping.`);
        break;
      }

      const $ = cheerio.load(html);

      // Try multiple selectors as Hacienda may change structure
      const rows = $(
        'table.gridView tr, table.tblSubastas tbody tr, table tbody tr, ' +
        'div.lista-subastas .subasta, .resultado-subasta, [data-id-subasta], ' +
        'table.resultados tbody tr, .search-results table tbody tr'
      );

      if (rows.length === 0) {
        if (page === 1) {
          console.warn('[Hacienda] No auction rows found on first page. Structure may have changed.');
        }
        console.log(`[Hacienda] No rows on page ${page}, stopping.`);
        break;
      }

      let foundAny = false;

      rows.each((_, el) => {
        try {
          const $row = $(el);
          const cells = $row.find('td');

          // Skip header rows
          if (cells.length < 3) return;

          // Extract ID from link or data attribute
          const linkEl = $row.find('a[href*="detalle"], a[href*="Detalle"], a[href*="id="], a[href*="subasta"]').first();
          const href = linkEl.attr('href') || '';
          const idMatch = href.match(/id[=:](\d+)/i) ||
                          href.match(/idSubasta[=:](\d+)/i) ||
                          href.match(/codSubasta[=:](\d+)/i) ||
                          href.match(/(\d+)/);
          const sourceId = idMatch ? idMatch[1] : $row.attr('data-id-subasta') || $row.attr('data-id') || '';

          if (!sourceId) return;

          const titulo = linkEl.text().trim() || $row.find('.titulo, .title, h3, h4').first().text().trim() || `Subasta Hacienda ${sourceId}`;
          const tipoBien = cells.length > 1 ? $(cells[1]).text().trim() : $row.find('.tipo-bien, .tipo').first().text().trim();
          const provincia = cells.length > 2 ? $(cells[2]).text().trim() : $row.find('.provincia').first().text().trim();
          const municipio = cells.length > 3 ? $(cells[3]).text().trim() : $row.find('.municipio').first().text().trim();
          const valorText = cells.length > 4 ? $(cells[4]).text().trim() : $row.find('.precio, .valor').first().text().trim();
          const fechaInicioText = cells.length > 5 ? $(cells[5]).text().trim() : $row.find('.fecha-inicio').first().text().trim();
          const fechaFinText = cells.length > 6 ? $(cells[6]).text().trim() : $row.find('.fecha-fin').first().text().trim();
          const estadoText = cells.length > 7 ? $(cells[7]).text().trim() : $row.find('.estado').first().text().trim() || 'pendiente';
          const organismo = cells.length > 8 ? $(cells[8]).text().trim() : $row.find('.organismo').first().text().trim() || 'Agencia Tributaria';

          const urlDetalle = href.startsWith('http') ? href : (href ? `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}` : '');

          auctions.push({
            source: SOURCE,
            source_id: sourceId,
            titulo,
            tipo_bien: tipoBien,
            provincia,
            municipio,
            direccion: '',
            valor_subasta: parseMoney(valorText),
            puja_minima: null,
            puja_actual: null,
            fecha_inicio: parseDate(fechaInicioText),
            fecha_fin: parseDate(fechaFinText),
            estado: estadoText || 'pendiente',
            descripcion: '',
            organismo: organismo || 'Agencia Tributaria',
            url_detalle: urlDetalle,
            referencia_catastral: '',
            cargas: '',
            lat: null,
            lng: null,
            imagen_url: '',
          });
          foundAny = true;
        } catch (err) {
          console.error('[Hacienda] Error parsing row:', err);
        }
      });

      if (!foundAny && page > 1) break;
      console.log(`[Hacienda] Page ${page}: ${rows.length} rows, total: ${auctions.length}`);
    } catch (err) {
      console.error(`[Hacienda] Error on page ${page}:`, err);
      break;
    }
  }

  return auctions;
}

// --- Scrape detail page ---
async function scrapeHaciendaDetail(auction: ScrapedAuction): Promise<ScrapedAuction> {
  if (!auction.url_detalle) return auction;

  try {
    const html = await rateLimitedFetch(auction.url_detalle);
    if (!html) return auction;

    const $ = cheerio.load(html);

    // Description
    const descSelectors = '.descripcion, #descripcion, .detalle-descripcion, [data-field="descripcion"], ' +
      'th:contains("Descripc") + td, th:contains("descripc") + td';
    const descEl = $(descSelectors);
    if (descEl.length) {
      auction.descripcion = descEl.first().text().trim().slice(0, 5000);
    }

    // Direccion
    const dirEl = $('th:contains("Direcci") + td, th:contains("Situo") + td, .direccion, [data-field="direccion"]');
    if (dirEl.length) {
      auction.direccion = dirEl.first().text().trim();
    }

    // Referencia catastral
    const refEl = $('th:contains("Referencia catastral") + td, th:contains("ref. cat") + td, .ref-catastral');
    if (refEl.length) {
      auction.referencia_catastral = refEl.first().text().trim();
    }

    // Cargas
    const cargasEl = $('th:contains("Cargas") + td, .cargas');
    if (cargasEl.length) {
      auction.cargas = cargasEl.first().text().trim();
    }

    // Pujas
    const pujaEl = $('th:contains("Puja") + td, .puja-actual, [data-field="puja"]');
    if (pujaEl.length) {
      auction.puja_actual = parseMoney(pujaEl.first().text());
    }

    const pujaMinEl = $('th:contains("puja m") + td, th:contains("Puja m") + td');
    if (pujaMinEl.length) {
      auction.puja_minima = parseMoney(pujaMinEl.first().text());
    }

    // Valor subasta
    if (!auction.valor_subasta) {
      const valorEl = $('th:contains("Valor") + td, th:contains("importe") + td, .valor-subasta');
      if (valorEl.length) {
        auction.valor_subasta = parseMoney(valorEl.first().text());
      }
    }

    // Image
    const imgEl = $('.detalle img, .imagen img, #imagen, .foto-subasta img');
    if (imgEl.length) {
      const src = imgEl.first().attr('src') || '';
      auction.imagen_url = src.startsWith('http') ? src : (src ? `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}` : auction.imagen_url);
    }

    // Dates
    if (!auction.fecha_inicio) {
      const fiEl = $('th:contains("Fecha inicio") + td, th:contains("Inicio") + td');
      if (fiEl.length) auction.fecha_inicio = parseDate(fiEl.first().text());
    }
    if (!auction.fecha_fin) {
      const ffEl = $('th:contains("Fecha fin") + td, th:contains("conclus") + td, th:contains("Final") + td');
      if (ffEl.length) auction.fecha_fin = parseDate(ffEl.first().text());
    }

    console.log(`[Hacienda] Detail scraped for ${auction.source_id}`);
  } catch (err) {
    console.error(`[Hacienda] Detail error for ${auction.source_id}:`, err);
  }

  return auction;
}

// --- Main ---
export async function scrapeHacienda(options: { maxPages?: number; scrapeDetails?: boolean } = {}): Promise<{
  auctions: ScrapedAuction[];
  errors: string[];
}> {
  const errors: string[] = [];
  let auctions: ScrapedAuction[] = [];

  console.log('[Hacienda] Starting scrape...');

  try {
    auctions = await scrapeHaciendaList(options.maxPages || 10);
    console.log(`[Hacienda] List scrape: ${auctions.length} auctions`);
  } catch (err: any) {
    errors.push(`List scrape error: ${err.message}`);
  }

  if (options.scrapeDetails !== false && auctions.length > 0) {
    const toDetail = auctions.slice(0, 100);
    console.log(`[Hacienda] Scraping details for ${toDetail.length} auctions...`);

    for (let i = 0; i < toDetail.length; i++) {
      try {
        toDetail[i] = await scrapeHaciendaDetail(toDetail[i]);
      } catch (err: any) {
        errors.push(`Detail error ${toDetail[i].source_id}: ${err.message}`);
      }
    }
    for (let i = 0; i < Math.min(auctions.length, toDetail.length); i++) {
      auctions[i] = toDetail[i];
    }
  }

  console.log(`[Hacienda] Complete: ${auctions.length} auctions, ${errors.length} errors`);
  return { auctions, errors };
}

if (typeof require !== 'undefined' && require.main === module) {
  scrapeHacienda({ maxPages: 3, scrapeDetails: true }).then(({ auctions, errors }) => {
    console.log(`\n=== HACIENDA SCRAPER RESULTS ===`);
    console.log(`Auctions: ${auctions.length}, Errors: ${errors.length}`);
    if (auctions[0]) console.log('Sample:', JSON.stringify(auctions[0], null, 2));
  }).catch(console.error);
}
