'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import Link from 'next/link';
import { Auction } from '@/lib/types';
import {
  formatPrice,
  formatDate,
  formatShortDate,
  getTimeRemaining,
  isEndingSoon,
  getTipoBienLabel,
  getTipoBienIcon,
  getSourceLabel,
  getEstadoBadge,
} from '@/lib/utils';
import AuctionCard from '@/components/AuctionCard';
import AlertForm from '@/components/AlertForm';

export default function SubastaDetailPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  
  const [auction, setAuction] = useState<Auction | null>(null);
  const [related, setRelated] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch('/subastas/data.json')
      .then((r) => r.json())
      .then((json: any) => {
        const found = (json.auctions || []).find((a: any) => String(a.id) === id || a.source_id === id);
        if (found) {
          setAuction(found);
        } else {
          setError('Subasta no encontrada');
        }
      })
      .catch(() => setError('Error al cargar la subasta'))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch related auctions
  useEffect(() => {
    if (!auction) return;
    const params = new URLSearchParams();
    if (auction.provincia) params.set('provincia', auction.provincia);
    if (auction.tipo_bien) params.set('tipo_bien', auction.tipo_bien);
    params.set('page', '1');

    fetch('/subastas/data.json')
      .then((r) => r.json())
      .then((json: any) => {
        let filtered = json.auctions || [];
        if (auction.provincia) filtered = filtered.filter((a: any) => a.provincia === auction.provincia);
        if (auction.tipo_bien) filtered = filtered.filter((a: any) => a.tipo_bien === auction.tipo_bien);
        setRelated(filtered.filter((a: any) => a.id !== auction.id).slice(0, 4));
      })
      .catch(() => setRelated([]));
  }, [auction?.id, auction?.provincia, auction?.tipo_bien]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: auction?.descripcion || 'Subasta', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-64 skeleton" />
          <div className="card-static p-6 space-y-4">
            <div className="h-8 w-48 skeleton" />
            <div className="h-6 w-32 skeleton" />
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-3/4 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <svg className="w-16 h-16 mx-auto text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-slate-400 mb-2">
          {error || 'Subasta no encontrada'}
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          La subasta que buscas puede haber sido eliminada o no existe.
        </p>
        <Link href="/buscar" className="btn-primary text-sm">
          Volver a buscar
        </Link>
      </div>
    );
  }

  const estado = getEstadoBadge(auction.estado);
  const timeLeft = getTimeRemaining(auction.fecha_fin);
  const endingSoon = isEndingSoon(auction.fecha_fin);
  const tipoLabel = getTipoBienLabel(auction.tipo_bien);
  const tipoIcon = getTipoBienIcon(auction.tipo_bien);
  const sourceLabel = getSourceLabel(auction.source);
  const sourceClass =
    auction.source === 'judicial'
      ? 'source-boe'
      : auction.source === 'hacienda'
      ? 'source-hacienda'
      : 'source-seguridad-social';

  const title = auction.descripcion
    ? auction.descripcion.length > 100
      ? auction.descripcion.slice(0, 100) + '...'
      : auction.descripcion
    : `${tipoLabel} en ${auction.municipio || auction.provincia}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-accent-400 transition-colors">
          Inicio
        </Link>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <Link href="/buscar" className="hover:text-accent-400 transition-colors">
          Buscar
        </Link>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-400 truncate max-w-xs">{title}</span>
      </nav>

      {/* Main content */}
      <div className="space-y-6">
        {/* Header card */}
        <div className="card-static p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${estado.bg} ${estado.color}`}>{estado.text}</span>
                <span className={`source-badge ${sourceClass}`}>{sourceLabel}</span>
                <span className="badge bg-navy-700 text-slate-300 border-navy-600">
                  {tipoIcon} {tipoLabel}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {title}
              </h1>
            </div>
          </div>

          {/* Price section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-navy-950/50 border border-navy-700/30">
            <div>
              <p className="text-xs text-slate-500 mb-1">Precio de subasta</p>
              <p className="text-2xl md:text-3xl font-bold text-accent-400">
                {formatPrice(auction.valor_subasta)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Puja mínima</p>
              <p className="text-lg font-semibold text-slate-300">
                {formatPrice(auction.puja_minima)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Puja actual</p>
              <p className="text-lg font-semibold text-slate-300">
                {auction.puja_actual ? formatPrice(auction.puja_actual) : 'Sin pujas'}
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            endingSoon
              ? 'bg-orange-500/5 border-orange-500/20'
              : timeLeft === 'Finalizada'
              ? 'bg-slate-500/5 border-slate-500/20'
              : 'bg-accent-500/5 border-accent-500/20'
          }`}>
            <svg className={`w-5 h-5 ${endingSoon ? 'text-orange-400' : 'text-accent-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className={`text-sm font-medium ${endingSoon ? 'text-orange-400' : timeLeft === 'Finalizada' ? 'text-slate-400' : 'text-accent-300'}`}>
                {timeLeft}
              </p>
              <p className="text-xs text-slate-600">
                Fecha fin: {formatDate(auction.fecha_fin)}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <DetailRow icon="📍" label="Provincia" value={auction.provincia} />
            <DetailRow icon="🏙️" label="Municipio" value={auction.municipio} />
            <DetailRow icon="🏠" label="Dirección" value={auction.direccion} />
            <DetailRow icon="🏛️" label="Organismo" value={auction.organismo} />
            <DetailRow icon="📋" label="Referencia catastral" value={auction.referencia_catastral} />
            <DetailRow icon="📅" label="Fecha inicio" value={formatShortDate(auction.fecha_inicio)} />
          </div>
        </div>

        {/* Description */}
        {auction.descripcion && (
          <div className="card-static p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Descripción
            </h2>
            <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
              {auction.descripcion}
            </div>
          </div>
        )}

        {/* Location */}
        {(auction.lat && auction.lng) && (
          <div className="card-static p-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ubicación
            </h2>
            <div className="map-container h-64">
              <div className="text-center">
                <p className="text-slate-600">
                  📍 {auction.lat.toFixed(4)}, {auction.lng.toFixed(4)}
                </p>
                <p className="text-xs text-slate-700 mt-1">
                  {auction.direccion}, {auction.municipio}, {auction.provincia}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {auction.url_detalle && (
            <a
              href={auction.url_detalle}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver en portal de subastas
            </a>
          )}
          <button
            onClick={() => setShowAlert(!showAlert)}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Crear alerta similar
          </button>
          <button
            onClick={handleShare}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {copied ? '¡Copiado!' : 'Compartir'}
          </button>
        </div>

        {/* Alert form */}
        {showAlert && (
          <div className="animate-slide-up">
            <AlertForm
              prefilledFilters={{
                provincia: auction.provincia,
                tipo_bien: auction.tipo_bien,
                source: auction.source,
              }}
            />
          </div>
        )}

        {/* Related auctions */}
        {related.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Subastas similares
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {related.map((a) => (
                <AuctionCard key={a.id} auction={a} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Detail row helper ───────────────────────────────────────────────────── */
function DetailRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-slate-600">{label}</p>
        <p className="text-sm text-slate-300">{value}</p>
      </div>
    </div>
  );
}