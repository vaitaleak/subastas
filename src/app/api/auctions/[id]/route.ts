import { NextRequest, NextResponse } from 'next/server';
import { getAuctionById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid auction ID' }, { status: 400 });
    }

    const auction = getAuctionById(id);

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    return NextResponse.json({ auction });
  } catch (err: any) {
    console.error('[API /auctions/[id]] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch auction', message: err.message },
      { status: 500 }
    );
  }
}
