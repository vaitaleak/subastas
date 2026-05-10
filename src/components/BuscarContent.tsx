'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import FilterPanel from '@/components/FilterPanel';
import AlertForm from '@/components/AlertForm';
import AuctionCard, { AuctionCardSkeleton } from '@/components/AuctionCard';
import dynamic from 'next/dynamic';
import { Auction, AuctionFilters, AuctionsResponse } from '@/lib/types';

// Dynamic import for AuctionMap to avoid SSR issues with Leaflet
const AuctionMap = dynamic(() => import('@/components/AuctionMap'), { ssr: false });

const PAGE_SIZE = 20;

export default function BuscarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Build filters from URL search params
  const buildFilters = useCallback((): AuctionFilters => {
    const f: AuctionFilters = { page: 1 };
    const query = searchParams.get('query');
    const provincia = searchParams.get('provincia');
    const tipo_bien = searchParams.get('tipo_bien');
    const source = searchParams.get('source');
    const estado = searchParams.get('estado');
    const precio_min = searchParams.get('precio_min');
    const precio_max = searchParams.get('precio_max');
    const sort = searchParams.get('sort');
    const page = searchParams.get('page');

    if (query) f.query = query;
    if (provincia) f.provincia = provincia;
    if (tipo_bien) f.tipo_bien = tipo_bien;
    if (source) f.source = source;
    if (estado) f.estado = estado;
    if (precio_min) f.precio_min = Number(precio_min);
    if (precio_max) f.precio_max = Number(precio_max);
    if (sort) f.sort = sort;
    if (page) f.page = Number(page);

    return f;
  }, [searchParams]);

  const filters = buildFilters();

  // Fetch auctions
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== '') params.set(k, String(v));
    });

    // Fetch static data
    fetch('/data.json')
      .then((r) => r.json())
      .then((json) => {
        let filtered = [...(json.auctions || [])];

        // Apply filters
        if (filters.provincia) filtered = filtered.filter((a: any) => a.provincia === filters.provincia);
        if (filters.tipo_bien) filtered = filtered.filter((a: any) => a.tipo_bien === filters.tipo_bien);
        if (filters.source) filtered = filtered.filter((a: any) => a.source === filters.source);
        if (filters.estado) filtered = filtered.filter((a: any) => a.estado === filters.estado);
        if (filters.precio_min) filtered = filtered.filter((a: any) => a.valor_subasta >= Number(filters.precio_min));
        if (filters.precio_max) filtered = filtered.filter((a: any) => a.valor_subasta <= Number(filters.precio_max));
        if (filters.query) {
          const q = filters.query.toLowerCase();
          filtered = filtered.filter((a: any) =>
            (a.titulo||'').toLowerCase().includes(q) || a.municipio.toLowerCase().includes(q) ||
            a.direccion.toLowerCase().includes(q) || a.provincia.toLowerCase().includes(q)
          );
        }

        // Sort
        const sort = filters.sort || '';
        if (sort === 'precio_asc') filtered.sort((a: any, b: any) => a.valor_subasta - b.valor_subasta);
        else if (sort === 'precio_desc') filtered.sort((a: any, b: any) => b.valor_subasta - a.valor_subasta);
        else if (sort === 'fecha_fin_asc') filtered.sort((a: any, b: any) => a.fecha_fin.localeCompare(b.fecha_fin));

        const total = filtered.length;
        const limit = 20;
        const totalPages = Math.ceil(total / limit);
        const start = (currentPage - 1) * limit;
        setAuctions(filtered.slice(start, start + limit));
        setTotal(total);
        setTotalPages(totalPages);
      })
      .catch(() => {
        setAuctions([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [searchParams.toString()]);

  // Update URL with filters
  const updateFilters = useCallback(
    (newFilters: AuctionFilters) => {
      const params = new URLSearchParams();
      Object.entries(newFilters).forEach(([k, v]) => {
        if (v != null && v !== '' && v !== 0) params.set(k, String(v));
      });
      router.push(`/buscar?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const handleSearch = useCallback(
    (query: string) => {
      updateFilters({ ...filters, query: query || undefined, page: 1 });
    },
    [filters, updateFilters]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateFilters({ ...filters, page });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [filters, updateFilters]
  );

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v != null && v !== '' && k !== 'page' && k !== 'sort'
  ).length;

  const currentPage = filters.page || 1;

  // Pagination range
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top bar: search + mobile filter toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <SearchBar
            initialValue={filters.query || ''}
            onSearch={handleSearch}
          />
        </div>
        <button
          onClick={() => setFiltersOpen(true)}
          className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 bg-navy-800 border border-navy-600 rounded-lg text-sm text-slate-300 hover:border-accent-500/50 transition-colors relative"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent-500 text-white text-xs flex items-center justify-center font-medium">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowAlertForm(!showAlertForm)}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 bg-navy-800 border border-navy-600 rounded-lg text-sm text-slate-300 hover:border-accent-500/50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Alerta
        </button>
        <button
          onClick={() => setShowMap(!showMap)}
          className={`flex items-center gap-1.5 px-4 py-2.5 bg-navy-800 border rounded-lg text-sm transition-colors ${
            showMap ? 'border-accent-500 text-accent-400' : 'border-navy-600 text-slate-300 hover:border-accent-500/50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          {showMap ? 'Lista' : 'Mapa'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Filters sidebar */}
        <FilterPanel
          filters={filters}
          onFilterChange={updateFilters}
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        />

        {/* Results area */}
        <div className="flex-1 min-w-0">
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              {loading ? (
                <div className="h-6 w-48 skeleton" />
              ) : (
                <p className="text-sm text-slate-400">
                  <span className="text-white font-semibold">{new Intl.NumberFormat('es-ES').format(total)}</span>{' '}
                  subasta{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
                  {filters.provincia && (
                    <span> en <span className="text-accent-400">{filters.provincia}</span></span>
                  )}
                </p>
              )}
            </div>

            {/* Sort on mobile */}
            <select
              value={filters.sort || ''}
              onChange={(e) => updateFilters({ ...filters, sort: e.target.value || undefined })}
              className="lg:hidden input text-xs py-1.5 w-auto"
            >
              <option value="">Relevancia</option>
              <option value="precio_asc">Precio ↑</option>
              <option value="precio_desc">Precio ↓</option>
              <option value="fecha_fin_asc">Fin próximo</option>
              <option value="fecha_pub_desc">Recientes</option>
            </select>
          </div>

          {/* Alert form (collapsible) */}
          {showAlertForm && (
            <div className="mb-6 animate-slide-up">
              <AlertForm prefilledFilters={filters} />
            </div>
          )}

          {/* Map view */}
          {showMap && !loading && auctions.length > 0 && (
            <div className="mb-6 h-[400px] md:h-[500px]">
              <AuctionMap auctions={auctions} />
            </div>
          )}

          {/* Auction grid */}
          {!showMap && (
            <>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <AuctionCardSkeleton key={i} />
                  ))}
                </div>
              ) : auctions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {auctions.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <svg className="w-16 h-16 mx-auto text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-slate-400 mb-2">No se encontraron subastas</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Prueba a modificar los filtros o busca con otros términos.
                  </p>
                  <button
                    onClick={() => updateFilters({ page: 1 })}
                    className="btn-secondary text-sm"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-navy-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ← Anterior
              </button>

              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dot-${i}`} className="px-2 text-slate-600">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      p === currentPage
                        ? 'bg-accent-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-navy-800'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-navy-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Siguiente →
              </button>
            </div>
          )}

          {/* Mobile alert button */}
          <div className="sm:hidden mt-8">
            <button
              onClick={() => setShowAlertForm(!showAlertForm)}
              className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Crear alerta con estos filtros
            </button>
            {showAlertForm && (
              <div className="mt-4">
                <AlertForm prefilledFilters={filters} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
