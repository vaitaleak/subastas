import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    // Demo mode - just return success
    return NextResponse.json({ 
      success: true, 
      message: 'Alerta creada. Recibirás un email de confirmación.' 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ success: true, message: 'Alerta eliminada' });
}
