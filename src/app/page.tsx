'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import StatsBar from '@/components/StatsBar';
import AuctionCard from '@/components/AuctionCard';
import SpainMap from '@/components/SpainMap';
import { Auction, AuctionsResponse } from '@/lib/types';
import { getTipoBienLabel } from '@/lib/utils';

const QUICK_FILTERS = [
  { tipo: 'vivienda', label: 'Viviendas', icon: '🏠' },
  { tipo: 'garaje', label: 'Garajes', icon: '🅿️' },
  { tipo: 'solar', label: 'Solares', icon: '🏗️' },
  { tipo: 'vehiculo', label: 'Coches', icon: '🚗' },
  { tipo: 'finca_rustica', label: 'Fincas', icon: '🌾' },
  { tipo: 'local', label: 'Locales', icon: '🏪' },
];

const STEPS = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Busca',
    description: 'Explora miles de subastas públicas de toda España. Sin registro, sin complicaciones.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
    title: 'Filtra',
    description: 'Por provincia, tipo de bien, precio, origen. Encuentra exactamente lo que buscas.',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    title: 'Contacta',
    description: 'Accede directamente a la fuente oficial y participa en la subasta que te interese.',
  },
];

export default function HomePage() {
  const [featured, setFeatured] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [auctionCounts, setAuctionCounts] = useState<Record<string, number>>({});
  const [statsData, setStatsData] = useState<{ totalActive: number; newToday: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auctions?estado=activa&page=1&sort=fecha_pub_desc')
      .then((r) => r.json())
      .then((data: AuctionsResponse) => {
        setFeatured((data.auctions || []).slice(0, 6));
      })
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        setAuctionCounts(data.totalByProvince || {});
        setStatsData({ totalActive: data.totalActive || 0, newToday: data.newToday || 0 });
      })
      .catch(() => {});
  }, []);

  const handleSearch = (query: string) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    router.push(`/buscar${params.toString() ? '?' + params.toString() : ''}`);
  };

  return (
    <div>
      {/* ─── Hero Section ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12 md:pt-24 md:pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-4 animate-fade-in">
            Todas las Subastas
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-accent-600">
              Públicas de España
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-8 animate-slide-up">
            Gratis. Sin registro. Actualizado cada día.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-8 animate-slide-up">
            <SearchBar onSearch={handleSearch} large />
          </div>

          {/* Quick filter chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-10 animate-slide-up">
            {QUICK_FILTERS.map((f) => (
              <Link
                key={f.tipo}
                href={`/buscar?tipo_bien=${f.tipo}`}
                className="chip hover:scale-105"
              >
                <span>{f.icon}</span>
                {f.label}
              </Link>
            ))}
          </div>

          {/* Stats */}
          <StatsBar />
        </div>
      </section>

      {/* ─── Featured Auctions ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="section-title">Subastas destacadas</h2>
            <p className="section-subtitle mt-1">Las últimas subastas activas</p>
          </div>
          <Link href="/buscar" className="btn-ghost text-sm hidden sm:flex items-center gap-1">
            Ver todas
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-static p-0 overflow-hidden animate-pulse">
                <div className="h-40 bg-navy-700/50" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-navy-700/50 rounded w-3/4" />
                  <div className="h-4 bg-navy-700/50 rounded w-1/2" />
                  <div className="h-6 bg-navy-700/50 rounded w-1/3" />
                </div>
              </div>
            ))
          ) : featured.length > 0 ? (
            featured.map((auction) => <AuctionCard key={auction.id} auction={auction} />)
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-500">No hay subastas destacadas en este momento.</p>
              <Link href="/buscar" className="btn-primary inline-block mt-4">
                Explorar subastas
              </Link>
            </div>
          )}
        </div>

        <div className="sm:hidden mt-6 text-center">
          <Link href="/buscar" className="btn-primary text-sm">
            Ver todas las subastas
          </Link>
        </div>
      </section>

      {/* ─── Map section ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="section-title mb-2">Mapa de subastas</h2>
        <p className="section-subtitle mb-6">Haz clic en una provincia para ver sus subastas</p>
        <div className="map-container h-80 md:h-[450px]">
          <SpainMap auctionCounts={auctionCounts} />
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────────── */}
      <section className="py-16 bg-navy-950/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">¿Cómo funciona?</h2>
            <p className="section-subtitle mt-2">Encuentra tu próxima subasta en 3 pasos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-accent-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  {step.icon}
                </div>
                <div className="text-xs text-accent-500 font-medium mb-2">Paso {i + 1}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Empieza a buscar subastas ahora
          </h2>
          <p className="text-slate-400 mb-8">
            Miles de subastas públicas actualizadas cada día. Totalmente gratis.
          </p>
          <Link href="/buscar" className="btn-primary text-lg px-8 py-3 inline-flex items-center gap-2">
            Explorar subastas
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
