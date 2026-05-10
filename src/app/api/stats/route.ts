import { NextResponse } from 'next/server';
import data from '@/../public/data.json';

export async function GET() {
  return NextResponse.json(data.stats);
}
