import { scrapeBoe } from './scrapers/boe';
import { scrapeHacienda } from './scrapers/hacienda';
import { scrapeSeguridadSocial } from './scrapers/seguridad-social';
import { upsertAuction, markClosedAuctions } from './db';
import { sendAlerts } from './email';
import type { ScrapedAuction, ScraperResult } from './types';

interface ScrapeStats {
  total: number;
  newCount: number;
  updatedCount: number;
  closedCount: number;
  errors: string[];
  sources: ScraperResult[];
  duration: number;
}

export async function runAllScrapers(options?: { maxPages?: number; scrapeDetails?: boolean }): Promise<ScrapeStats> {
  const startTime = Date.now();
  const sources: ScraperResult[] = [];
  let totalNew = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  const allErrors: string[] = [];

  console.log('=== Starting full scrape run ===');

  // --- BOE ---
  try {
    console.log('\n>>> Running BOE scraper...');
    const boeResult = await scrapeBoe({
      maxPages: options?.maxPages || 5,
      scrapeDetails: options?.scrapeDetails,
    });
    const boeStats = processScrapedAuctions('boe', boeResult.auctions, boeResult.errors);
    sources.push(boeStats);
    totalNew += boeStats.new;
    totalUpdated += boeStats.updated;
    totalErrors += boeStats.errors;
    allErrors.push(...boeResult.errors);
  } catch (err: any) {
    console.error('[Manager] BOE scraper failed:', err.message);
    sources.push({ source: 'boe', scraped: 0, new: 0, updated: 0, errors: 1, errorMessages: [err.message] });
    allErrors.push(`BOE: ${err.message}`);
  }

  // --- Hacienda ---
  try {
    console.log('\n>>> Running Hacienda scraper...');
    const haciendaResult = await scrapeHacienda({
      maxPages: options?.maxPages || 5,
      scrapeDetails: options?.scrapeDetails,
    });
    const haciendaStats = processScrapedAuctions('hacienda', haciendaResult.auctions, haciendaResult.errors);
    sources.push(haciendaStats);
    totalNew += haciendaStats.new;
    totalUpdated += haciendaStats.updated;
    totalErrors += haciendaStats.errors;
    allErrors.push(...haciendaResult.errors);
  } catch (err: any) {
    console.error('[Manager] Hacienda scraper failed:', err.message);
    sources.push({ source: 'hacienda', scraped: 0, new: 0, updated: 0, errors: 1, errorMessages: [err.message] });
    allErrors.push(`Hacienda: ${err.message}`);
  }

  // --- Seguridad Social ---
  try {
    console.log('\n>>> Running Seguridad Social scraper...');
    const ssResult = await scrapeSeguridadSocial({
      maxPages: options?.maxPages || 5,
      scrapeDetails: options?.scrapeDetails,
    });
    const ssStats = processScrapedAuctions('ss', ssResult.auctions, ssResult.errors);
    sources.push(ssStats);
    totalNew += ssStats.new;
    totalUpdated += ssStats.updated;
    totalErrors += ssStats.errors;
    allErrors.push(...ssResult.errors);
  } catch (err: any) {
    console.error('[Manager] Seguridad Social scraper failed:', err.message);
    sources.push({ source: 'ss', scraped: 0, new: 0, updated: 0, errors: 1, errorMessages: [err.message] });
    allErrors.push(`SS: ${err.message}`);
  }

  // --- Mark closed auctions ---
  let closedCount = 0;
  try {
    closedCount = markClosedAuctions();
    console.log(`\nMarked ${closedCount} auctions as closed`);
  } catch (err: any) {
    console.error('[Manager] Error marking closed auctions:', err.message);
    allErrors.push(`Mark closed: ${err.message}`);
  }

  // --- Send email alerts for new auctions ---
  if (totalNew > 0) {
    try {
      await sendAlerts();
    } catch (err: any) {
      console.error('[Manager] Error sending alerts:', err.message);
      allErrors.push(`Alerts: ${err.message}`);
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  const stats: ScrapeStats = {
    total: sources.reduce((sum, s) => sum + s.scraped, 0),
    newCount: totalNew,
    updatedCount: totalUpdated,
    closedCount,
    errors: allErrors,
    sources,
    duration,
  };

  console.log('\n=== Scrape run complete ===');
  console.log(`Total scraped: ${stats.total}`);
  console.log(`New: ${totalNew}, Updated: ${totalUpdated}, Closed: ${closedCount}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Duration: ${duration}s`);

  return stats;
}

function processScrapedAuctions(source: string, auctions: ScrapedAuction[], errorMessages: string[]): ScraperResult {
  let newCount = 0;
  let updatedCount = 0;

  for (const auction of auctions) {
    try {
      const result = upsertAuction(auction);
      if (result.inserted) newCount++;
      else if (result.updated) updatedCount++;
    } catch (err: any) {
      console.error(`[Manager] Error upserting auction ${auction.source_id}:`, err.message);
      errorMessages.push(`Upsert ${auction.source_id}: ${err.message}`);
    }
  }

  console.log(`[${source}] Processed ${auctions.length} auctions: ${newCount} new, ${updatedCount} updated`);

  return {
    source: source as any,
    scraped: auctions.length,
    new: newCount,
    updated: updatedCount,
    errors: errorMessages.length,
    errorMessages,
  };
}

// Allow direct execution
if (typeof require !== 'undefined' && require.main === module) {
  runAllScrapers({ maxPages: 3, scrapeDetails: true })
    .then(stats => console.log('\nFinal stats:', JSON.stringify(stats, null, 2)))
    .catch(console.error);
}
