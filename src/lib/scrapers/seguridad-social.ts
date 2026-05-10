import * as cheerio from 'cheerio';
import type { ScrapedAuction, AuctionSource } from '../types';

const SOURCE: AuctionSource = 'ss';
const BASE_URL = 'https://subastas.seg-social.es';
const LIST_URL = `${BASE_URL}/subastas`;
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
        console.warn(`[SS] Rate limited on attempt ${attempt}`);
        await sleep(5000 * attempt);
        continue;
      }

      if (!response.ok) {
        console.warn(`[SS] HTTP ${response.status} for ${url}`);
        if (response.status >= 500) {
          await sleep(2000 * attempt);
          continue;
        }
        return null;
      }

      return await response.text();
    } catch (err: any) {
      console.error(`[SS] Fetch error attempt ${attempt}: ${err.message}`);
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

// --- Scrape list pages ---
async function scrapeSSList(maxPages = 10): Promise<ScrapedAuction[]> {
  const auctions: ScrapedAuction[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = page === 1 ? LIST_URL : `${LIST_URL}?page=${page}`;
      console.log(`[SS] Scraping list page ${page}: ${url}`);

      const html = await rateLimitedFetch(url);
      if (!html) {
        console.warn(`[SS] No HTML for page ${page}, stopping.`);
        break;
      }

      const $ = cheerio.load(html);

      // Try multiple selectors for Seguridad Social site
      const rows = $(
        'table.table tbody tr, table.listado tbody tr, table.subastas tbody tr, ' +
        'table tbody tr, div.subasta-item, .resultado-subasta, ' +
        'div.list-group .list-group-item, .search-result, [data-id-subasta]'
      );

      if (rows.length === 0) {
        if (page === 1) {
          console.warn('[SS] No auction rows found on first page. Structure may have changed.');
        }
        console.log(`[SS] No rows on page ${page}, stopping.`);
        break;
      }

      let foundAny = false;

      rows.each((_, el) => {
        try {
          const $row = $(el);
          const cells = $row.find('td');
          if (cells.length < 2 && !$row.attr('data-id-subasta')) return;

          // Extract ID
          const linkEl = $row.find('a[href*="detalle"], a[href*="detail"], a[href*="id="], a[href*="subasta"]').first();
          const href = linkEl.attr('href') || '';
          const idMatch = href.match(/id[=:](\d+)/i) ||
                          href.match(/codSubasta[=:](\d+)/i) ||
                          href.match(/idSubasta[=:](\d+)/i) ||
                          href.match(/(\d+)/);
          const sourceId = idMatch ? idMatch[1] : $row.attr('data-id-subasta') || $row.attr('data-id') || '';

          if (!sourceId) return;

          // Determine if it's a table layout or card layout
          const getText = (idx: number, fallbackSelector: string): string => {
            if (cells.length > idx) return $(cells[idx]).text().trim();
            return $row.find(fallbackSelector).first().text().trim();
          };

          const titulo = linkEl.text().trim() || getText(0, '.titulo, .title, h3, h4') || `Subasta Seguridad Social ${sourceId}`;
          const tipoBien = getText(1, '.tipo-bien, .tipo');
          const provincia = getText(2, '.provincia');
          const municipio = getText(3, '.municipio');
          const valorText = getText(4, '.precio, .valor');
          const fechaInicioText = getText(5, '.fecha-inicio');
          const fechaFinText = getText(6, '.fecha-fin');
          const estadoText = getText(7, '.estado') || 'pendiente';
          const organismo = getText(8, '.organismo') || 'Seguridad Social';

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
            organismo: organismo || 'Seguridad Social',
            url_detalle: urlDetalle,
            referencia_catastral: '',
            cargas: '',
            lat: null,
            lng: null,
            imagen_url: '',
          });
          foundAny = true;
        } catch (err) {
          console.error('[SS] Error parsing row:', err);
        }
      });

      if (!foundAny && page > 1) break;
      console.log(`[SS] Page ${page}: ${rows.length} rows, total: ${auctions.length}`);
    } catch (err) {
      console.error(`[SS] Error on page ${page}:`, err);
      break;
    }
  }

  return auctions;
}

// --- Scrape detail ---
async function scrapeSSDetail(auction: ScrapedAuction): Promise<ScrapedAuction> {
  if (!auction.url_detalle) return auction;

  try {
    const html = await rateLimitedFetch(auction.url_detalle);
    if (!html) return auction;

    const $ = cheerio.load(html);

    // Description
    const descEl = $('.descripcion, #descripcion, .detalle-descripcion, ' +
      'th:contains("Descripc") + td, th:contains("Observaciones") + td');
    if (descEl.length) {
      auction.descripcion = descEl.first().text().trim().slice(0, 5000);
    }

    // Direccion
    const dirEl = $('th:contains("Direcci") + td, th:contains("Situaci") + td, .direccion');
    if (dirEl.length) {
      auction.direccion = dirEl.first().text().trim();
    }

    // Referencia catastral
    const refEl = $('th:contains("Referencia catastral") + td, th:contains("ref. cat") + td');
    if (refEl.length) {
      auction.referencia_catastral = refEl.first().text().trim();
    }

    // Cargas
    const cargasEl = $('th:contains("Cargas") + td, .cargas');
    if (cargasEl.length) {
      auction.cargas = cargasEl.first().text().trim();
    }

    // Pujas
    const pujaEl = $('th:contains("Puja") + td, .puja-actual');
    if (pujaEl.length) {
      auction.puja_actual = parseMoney(pujaEl.first().text());
    }

    const pujaMinEl = $('th:contains("puja m") + td, th:contains("Puja m") + td');
    if (pujaMinEl.length) {
      auction.puja_minima = parseMoney(pujaMinEl.first().text());
    }

    // Valor
    if (!auction.valor_subasta) {
      const valorEl = $('th:contains("Valor") + td, th:contains("importe") + td, .valor');
      if (valorEl.length) {
        auction.valor_subasta = parseMoney(valorEl.first().text());
      }
    }

    // Image
    const imgEl = $('.detalle img, .imagen img, .foto img');
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
      const ffEl = $('th:contains("Fecha fin") + td, th:contains("conclus") + td');
      if (ffEl.length) auction.fecha_fin = parseDate(ffEl.first().text());
    }

    console.log(`[SS] Detail scraped for ${auction.source_id}`);
  } catch (err) {
    console.error(`[SS] Detail error for ${auction.source_id}:`, err);
  }

  return auction;
}

// --- Main ---
export async function scrapeSeguridadSocial(options: { maxPages?: number; scrapeDetails?: boolean } = {}): Promise<{
  auctions: ScrapedAuction[];
  errors: string[];
}> {
  const errors: string[] = [];
  let auctions: ScrapedAuction[] = [];

  console.log('[SS] Starting scrape...');

  try {
    auctions = await scrapeSSList(options.maxPages || 10);
    console.log(`[SS] List scrape: ${auctions.length} auctions`);
  } catch (err: any) {
    errors.push(`List scrape error: ${err.message}`);
  }

  if (options.scrapeDetails !== false && auctions.length > 0) {
    const toDetail = auctions.slice(0, 100);
    console.log(`[SS] Scraping details for ${toDetail.length} auctions...`);

    for (let i = 0; i < toDetail.length; i++) {
      try {
        toDetail[i] = await scrapeSSDetail(toDetail[i]);
      } catch (err: any) {
        errors.push(`Detail error ${toDetail[i].source_id}: ${err.message}`);
      }
    }
    for (let i = 0; i < Math.min(auctions.length, toDetail.length); i++) {
      auctions[i] = toDetail[i];
    }
  }

  console.log(`[SS] Complete: ${auctions.length} auctions, ${errors.length} errors`);
  return { auctions, errors };
}

if (typeof require !== 'undefined' && require.main === module) {
  scrapeSeguridadSocial({ maxPages: 3, scrapeDetails: true }).then(({ auctions, errors }) => {
    console.log(`\n=== SEGURIDAD SOCIAL SCRAPER RESULTS ===`);
    console.log(`Auctions: ${auctions.length}, Errors: ${errors.length}`);
    if (auctions[0]) console.log('Sample:', JSON.stringify(auctions[0], null, 2));
  }).catch(console.error);
}
