import { NextRequest, NextResponse } from 'next/server';
import { createAlert, deleteAlert, verifyAlert, getActiveAlerts } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/alerts - list alerts (admin/debug), or verify via token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Verify email endpoint: /api/alerts?verify=token
    const verifyToken = searchParams.get('verify');
    if (verifyToken) {
      const success = verifyAlert(verifyToken);
      if (success) {
        return NextResponse.json({ success: true, message: 'Alerta verificada correctamente' });
      }
      return NextResponse.json({ error: 'Token no valido o ya verificado' }, { status: 400 });
    }

    // List active alerts (could be admin-only in production)
    const email = searchParams.get('email');
    if (email) {
      const allAlerts = getActiveAlerts();
      const userAlerts = allAlerts.filter(a => a.email === email);
      return NextResponse.json({
        alerts: userAlerts.map(a => ({
          id: a.id,
          email: a.email,
          filters: JSON.parse(a.filtros_json),
          activa: a.activa,
          created_at: a.created_at,
        })),
      });
    }

    return NextResponse.json({ error: 'Provide ?verify=token or ?email=...' }, { status: 400 });
  } catch (err: any) {
    console.error('[API /alerts GET] Error:', err);
    return NextResponse.json({ error: 'Failed', message: err.message }, { status: 500 });
  }
}

// POST /api/alerts - create a new alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, filters } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ error: 'filters object is required' }, { status: 400 });
    }

    // Validate filter values
    const validFilters: Record<string, any> = {};
    if (filters.provincia && typeof filters.provincia === 'string') {
      validFilters.provincia = filters.provincia;
    }
    if (filters.tipo_bien && typeof filters.tipo_bien === 'string') {
      validFilters.tipo_bien = filters.tipo_bien;
    }
    if (filters.precio_min !== undefined && typeof filters.precio_min === 'number') {
      validFilters.precio_min = filters.precio_min;
    }
    if (filters.precio_max !== undefined && typeof filters.precio_max === 'number') {
      validFilters.precio_max = filters.precio_max;
    }
    if (filters.query && typeof filters.query === 'string') {
      validFilters.query = filters.query;
    }

    if (validFilters.precio_min !== undefined && validFilters.precio_max !== undefined) {
      if (validFilters.precio_min > validFilters.precio_max) {
        return NextResponse.json({ error: 'precio_min cannot be greater than precio_max' }, { status: 400 });
      }
    }

    const alert = createAlert(email, validFilters);

    return NextResponse.json({
      success: true,
      alert: {
        id: alert.id,
        email: alert.email,
        filters: validFilters,
        message: 'Alerta creada. Recibiras un email cuando haya nuevas subastas que coincidan.',
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error('[API /alerts POST] Error:', err);
    return NextResponse.json({ error: 'Failed to create alert', message: err.message }, { status: 500 });
  }
}

// DELETE /api/alerts?id=123
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const deleted = deleteAlert(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Alerta eliminada' });
  } catch (err: any) {
    console.error('[API /alerts DELETE] Error:', err);
    return NextResponse.json({ error: 'Failed to delete alert', message: err.message }, { status: 500 });
  }
}
