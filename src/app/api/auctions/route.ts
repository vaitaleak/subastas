import { NextRequest, NextResponse } from 'next/server';
import { getDemoAuctions } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const filters: Record<string, string> = {};

    if (searchParams.get('provincia')) filters.provincia = searchParams.get('provincia')!;
    if (searchParams.get('tipo_bien')) filters.tipo_bien = searchParams.get('tipo_bien')!;
    if (searchParams.get('source')) filters.source = searchParams.get('source')!;
    if (searchParams.get('estado')) filters.estado = searchParams.get('estado')!;
    if (searchParams.get('precio_min')) filters.precio_min = searchParams.get('precio_min')!;
    if (searchParams.get('precio_max')) filters.precio_max = searchParams.get('precio_max')!;
    if (searchParams.get('query')) filters.query = searchParams.get('query')!;
    if (searchParams.get('sort')) filters.sort = searchParams.get('sort')!;
    if (searchParams.get('page')) filters.page = searchParams.get('page')!;

    const result = getDemoAuctions(filters);
    const page = Number(filters.page || '1');
    const totalPages = Math.ceil(result.total / 20);

    // Return format expected by frontend: { auctions, total, page, totalPages }
    return NextResponse.json({
      auctions: result.auctions,
      total: result.total,
      page,
      totalPages,
    });
  } catch (err: any) {
    console.error('[API /auctions] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch auctions', message: err.message }, { status: 500 });
  }
}
