import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  // In demo mode, just return info
  return NextResponse.json({
    mode: 'demo',
    message: 'Scraping requires full backend with SQLite. Using demo data.',
    stats: { new: 0, updated: 0, closed: 0 }
  });
}
