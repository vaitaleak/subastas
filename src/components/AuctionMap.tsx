'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { getAuctionCoordinates } from '@/lib/geocode';
import { formatPrice } from '@/lib/utils';
import type { Auction } from '@/lib/types';

// Load Leaflet CSS dynamically
if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

function getMarkerColor(tipo: string): string {
  const colors: Record<string, string> = {
    Vivienda: '#3b82f6',
    Garaje: '#6b7280',
    Solar: '#22c55e',
    'Finca rústica': '#a3e635',
    'Local comercial': '#ec4899',
    'Nave industrial': '#f59e0b',
    Vehículo: '#f97316',
  };
  return colors[tipo] || '#8b5cf6';
}

function createMarkerIcon(tipo: string): L.DivIcon {
  const color = getMarkerColor(tipo);
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.6);box-shadow:0 0 4px ${color}80;"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  });
}

interface AuctionMapProps {
  auctions: Auction[];
}

export default function AuctionMap({ auctions }: AuctionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const markers = useMemo(() => {
    return auctions
      .map((auction) => {
        const coords = getAuctionCoordinates(
          auction.lat,
          auction.lng,
          auction.provincia,
          auction.municipio
        );
        return { auction, coords };
      })
      .filter((m) => m.coords);
  }, [auctions]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [40.0, -3.7],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB',
      maxZoom: 18,
    }).addTo(map);

    const markerGroup = L.featureGroup();

    markers.forEach(({ auction, coords }) => {
      const marker = L.marker([coords!.lat, coords!.lng], {
        icon: createMarkerIcon(auction.tipo_bien),
      });
      marker.bindPopup(`
        <div style="min-width:180px;color:#e2e8f0;">
          <div style="font-weight:600;margin-bottom:4px;">${auction.titulo || auction.tipo_bien}</div>
          <div style="font-size:13px;color:#94a3b8;">${auction.provincia}, ${auction.municipio}</div>
          <div style="font-size:15px;font-weight:700;color:#8b5cf6;margin-top:6px;">${formatPrice(auction.valor_subasta)}</div>
          <a href="/subastas/subasta/${auction.id}/" style="color:#8b5cf6;font-size:12px;">Ver detalle →</a>
        </div>
      `);
      markerGroup.addLayer(marker);
    });

    markerGroup.addTo(map);

    if (markers.length > 0) {
      map.fitBounds(markerGroup.getBounds().pad(0.1));
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [markers]);

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-navy-700/50">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 bg-navy-900/90 backdrop-blur-sm rounded-lg p-2 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5"><span style={{width:8,height:8,borderRadius:'50%',background:'#3b82f6',display:'inline-block'}}></span> Vivienda</div>
        <div className="flex items-center gap-1.5"><span style={{width:8,height:8,borderRadius:'50%',background:'#6b7280',display:'inline-block'}}></span> Garaje</div>
        <div className="flex items-center gap-1.5"><span style={{width:8,height:8,borderRadius:'50%',background:'#22c55e',display:'inline-block'}}></span> Solar</div>
        <div className="flex items-center gap-1.5"><span style={{width:8,height:8,borderRadius:'50%',background:'#f97316',display:'inline-block'}}></span> Vehículo</div>
      </div>
    </div>
  );
}
