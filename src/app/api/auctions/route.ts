import { NextRequest, NextResponse } from 'next/server';
import data from '@/../public/data.json';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    let auctions = [...data.auctions];

    // Filters
    const provincia = searchParams.get('provincia');
    const tipo_bien = searchParams.get('tipo_bien');
    const source = searchParams.get('source');
    const estado = searchParams.get('estado');
    const precio_min = searchParams.get('precio_min');
    const precio_max = searchParams.get('precio_max');
    const query = searchParams.get('query');
    const sort = searchParams.get('sort');
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (provincia) auctions = auctions.filter(a => a.provincia === provincia);
    if (tipo_bien) auctions = auctions.filter(a => a.tipo_bien === tipo_bien);
    if (source) auctions = auctions.filter(a => a.source === source);
    if (estado) auctions = auctions.filter(a => a.estado === estado);
    if (precio_min) auctions = auctions.filter(a => a.valor_subasta >= Number(precio_min));
    if (precio_max) auctions = auctions.filter(a => a.valor_subasta <= Number(precio_max));
    if (query) {
      const q = query.toLowerCase();
      auctions = auctions.filter(a =>
        (a.titulo || '').toLowerCase().includes(q) ||
        a.municipio.toLowerCase().includes(q) ||
        a.direccion.toLowerCase().includes(q) ||
        a.provincia.toLowerCase().includes(q) ||
        (a.referencia_catastral || '').includes(q)
      );
    }

    // Sort
    switch (sort) {
      case 'precio_asc': auctions.sort((a, b) => a.valor_subasta - b.valor_subasta); break;
      case 'precio_desc': auctions.sort((a, b) => b.valor_subasta - a.valor_subasta); break;
      case 'fecha_fin_asc': auctions.sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin)); break;
      case 'fecha_fin_desc': auctions.sort((a, b) => b.fecha_fin.localeCompare(a.fecha_fin)); break;
      default: break;
    }

    const limit = 20;
    const total = auctions.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;

    return NextResponse.json({
      auctions: auctions.slice(start, start + limit),
      total,
      page,
      totalPages,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
