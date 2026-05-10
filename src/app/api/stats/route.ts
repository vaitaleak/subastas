import { NextResponse } from 'next/server';
import { getDemoStats } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = getDemoStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
