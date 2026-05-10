import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    // Total active auctions
    const activeResult = db.prepare(
      `SELECT COUNT(*) as count FROM auctions WHERE estado LIKE '%activa%' OR estado LIKE '%próxima%'`
    ).get() as { count: number };

    // By province
    const byProvince = db.prepare(
      `SELECT provincia, COUNT(*) as count FROM auctions WHERE provincia IS NOT NULL GROUP BY provincia ORDER BY count DESC`
    ).all() as { provincia: string; count: number }[];

    const totalByProvince: Record<string, number> = {};
    for (const row of byProvince) {
      totalByProvince[row.provincia] = row.count;
    }

    // By tipo_bien
    const byTipo = db.prepare(
      `SELECT tipo_bien, COUNT(*) as count FROM auctions WHERE tipo_bien IS NOT NULL GROUP BY tipo_bien ORDER BY count DESC`
    ).all() as { tipo_bien: string; count: number }[];

    const totalByTipo: Record<string, number> = {};
    for (const row of byTipo) {
      totalByTipo[row.tipo_bien] = row.count;
    }

    // New today
    const today = new Date().toISOString().slice(0, 10);
    const todayResult = db.prepare(
      `SELECT COUNT(*) as count FROM auctions WHERE DATE(created_at) = ?`
    ).get(today) as { count: number };

    // Last updated
    const lastUpdatedResult = db.prepare(
      `SELECT MAX(updated_at) as last_updated FROM auctions`
    ).get() as { last_updated: string | null };

    return NextResponse.json({
      totalActive: activeResult.count,
      totalByProvince,
      totalByTipo,
      newToday: todayResult.count,
      lastUpdated: lastUpdatedResult.last_updated || new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[API /stats] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch stats', message: err.message },
      { status: 500 }
    );
  }
}
