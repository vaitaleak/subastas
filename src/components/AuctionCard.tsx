'use client';

import Link from 'next/link';
import { Auction } from '@/lib/types';
import {
  formatPrice,
  getTimeRemaining,
  isEndingSoon,
  getTipoBienLabel,
  getTipoBienIcon,
  getSourceLabel,
  getEstadoBadge,
  truncate,
} from '@/lib/utils';

interface AuctionCardProps {
  auction: Auction;
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  const estado = getEstadoBadge(auction.estado);
  const timeLeft = getTimeRemaining(auction.fecha_fin);
  const endingSoon = isEndingSoon(auction.fecha_fin);
  const tipoLabel = getTipoBienLabel(auction.tipo_bien);
  const tipoIcon = getTipoBienIcon(auction.tipo_bien);
  const sourceLabel = getSourceLabel(auction.source);
  const title = auction.descripcion
    ? truncate(auction.descripcion, 80)
    : `${tipoLabel} en ${auction.municipio || auction.provincia}`;

  const sourceClass =
    auction.source === 'boe'
      ? 'source-boe'
      : auction.source === 'hacienda'
      ? 'source-hacienda'
      : 'source-seguridad-social';

  return (
    <Link href={`/subasta?id=${auction.id}`} className="block group">
      <div className="card p-0 overflow-hidden">
        {/* Image / Icon area */}
        <div className="relative h-40 bg-navy-800 flex items-center justify-center overflow-hidden">
          {auction.imagen_url ? (
            <img
              src={auction.imagen_url}
              alt={tipoLabel}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="text-5xl opacity-30 group-hover:opacity-50 transition-opacity">
              {tipoIcon}
            </div>
          )}
          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className={`badge ${estado.bg} ${estado.color}`}>{estado.text}</span>
          </div>
          <div className="absolute top-3 right-3">
            <span className={`source-badge ${sourceClass}`}>{sourceLabel}</span>
          </div>
          {/* Tipo bien badge bottom-left */}
          <div className="absolute bottom-3 left-3">
            <span className="badge bg-navy-900/80 text-slate-300 border-navy-600/50 backdrop-blur-sm">
              {tipoIcon} {tipoLabel}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="auction-card-title font-semibold text-slate-200 group-hover:text-white transition-colors leading-snug">
            {title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">
              {auction.municipio}{auction.municipio && auction.provincia ? ', ' : ''}{auction.provincia}
            </span>
          </div>

          {/* Price + Time */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Precio de subasta</p>
              <p className="auction-card-price text-lg font-bold text-accent-400 transition-colors">
                {formatPrice(auction.valor_subasta)}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-xs ${endingSoon ? 'text-orange-400' : 'text-slate-500'}`}>
                {timeLeft === 'Finalizada' ? '' : '⏱ '}
                {timeLeft}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Skeleton loader ─────────────────────────────────────────────────────── */
export function AuctionCardSkeleton() {
  return (
    <div className="card-static p-0 overflow-hidden animate-pulse">
      <div className="h-40 bg-navy-700/50" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-navy-700/50 rounded w-3/4" />
        <div className="h-4 bg-navy-700/50 rounded w-1/2" />
        <div className="flex justify-between">
          <div className="h-6 bg-navy-700/50 rounded w-1/3" />
          <div className="h-4 bg-navy-700/50 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}
