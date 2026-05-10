import { NextRequest, NextResponse } from 'next/server';
import { runAllScrapers } from '@/lib/scraper-manager';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

export async function GET(request: NextRequest) {
  try {
    // Protect with CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const urlSecret = request.nextUrl.searchParams.get('secret');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && urlSecret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide CRON_SECRET via Authorization header or ?secret param.' },
        { status: 401 }
      );
    }

    console.log('[API /cron/scrape] Starting scrape run...');

    const maxPages = parseInt(request.nextUrl.searchParams.get('maxPages') || '5', 10);
    const scrapeDetails = request.nextUrl.searchParams.get('details') !== 'false';

    const stats = await runAllScrapers({
      maxPages: Math.min(maxPages, 20),
      scrapeDetails,
    });

    return NextResponse.json({
      success: true,
      stats: {
        total: stats.total,
        new: stats.newCount,
        updated: stats.updatedCount,
        closed: stats.closedCount,
        duration: stats.duration,
        errors: stats.errors.length,
        sources: stats.sources.map(s => ({
          source: s.source,
          scraped: s.scraped,
          new: s.new,
          updated: s.updated,
          errors: s.errors,
        })),
      },
      errorDetails: stats.errors.length > 0 ? stats.errors.slice(0, 20) : undefined,
    });
  } catch (err: any) {
    console.error('[API /cron/scrape] Fatal error:', err);
    return NextResponse.json(
      { error: 'Scrape run failed', message: err.message },
      { status: 500 }
    );
  }
}
