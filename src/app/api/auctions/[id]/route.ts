import { NextResponse } from 'next/server';
import data from '@/../public/data.json';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  const auction = data.auctions.find((a: any) => a.id === id);
  if (!auction) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ auction });
}
