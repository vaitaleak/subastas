import { NextRequest, NextResponse } from 'next/server';
import { getAuctions, getAuctionById, searchAuctions } from '@/lib/db';
import type { AuctionFilters } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Check if looking for a single auction by ID
    const idParam = searchParams.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid id parameter' }, { status: 400 });
      }
      const auction = getAuctionById(id);
      if (!auction) {
        return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
      }
      return NextResponse.json({ auction });
    }

    // Build filters
    const filters: AuctionFilters = {
      provincia: searchParams.get('provincia') || undefined,
      tipo_bien: searchParams.get('tipo_bien') || undefined,
      precio_min: searchParams.get('precio_min') ? parseFloat(searchParams.get('precio_min')!) : undefined,
      precio_max: searchParams.get('precio_max') ? parseFloat(searchParams.get('precio_max')!) : undefined,
      query: searchParams.get('query') || undefined,
      source: (searchParams.get('source') as AuctionFilters['source']) || undefined,
      estado: searchParams.get('estado') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: Math.min(parseInt(searchParams.get('limit') || '20', 10), 100),
      sort: searchParams.get('sort') || undefined,
    };

    // Validate numeric params
    if (filters.precio_min !== undefined && isNaN(filters.precio_min)) {
      return NextResponse.json({ error: 'Invalid precio_min' }, { status: 400 });
    }
    if (filters.precio_max !== undefined && isNaN(filters.precio_max)) {
      return NextResponse.json({ error: 'Invalid precio_max' }, { status: 400 });
    }
    if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
      return NextResponse.json({ error: 'Invalid page' }, { status: 400 });
    }

    const result = getAuctions(filters);

    return NextResponse.json({
      auctions: result.auctions,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: filters.limit,
      },
    });
  } catch (err: any) {
    console.error('[API /auctions] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch auctions', message: err.message },
      { status: 500 }
    );
  }
}
