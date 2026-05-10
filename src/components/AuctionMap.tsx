'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
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
  const link2 = document.createElement('link');
  link2.id = 'leaflet-cluster-css';
  link2.rel = 'stylesheet';
  link2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
  document.head.appendChild(link2);
  const link3 = document.createElement('link');
  link3.id = 'leaflet-cluster-css2';
  link3.rel = 'stylesheet';
  link3.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
  document.head.appendChild(link3);
}

// Fix leaflet default marker icon issue with bundlers
const DEFAULT_ICON = L.divIcon({
  html: '',
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -8],
});

// Color mapping by tipo_bien
function getMarkerColor(tipo: string): string {
  const colors: Record<string, string> = {
    vivienda: '#3b82f6',    // blue
    garaje: '#6b7280',      // gray
    solar: '#22c55e',       // green
    vehiculo: '#f97316',    // orange
    finca_rustica: '#a3e635', // lime
    local: '#ec4899',       // pink
    nave: '#f59e0b',        // amber
    oficina: '#8b5cf6',     // violet
    trastero: '#64748b',    // slate
    nave_almacen: '#d97706', // amber-dark
  };
  return colors[tipo] || '#8b5cf6';
}

function createMarkerIcon(tipo: string): L.DivIcon {
  const color = getMarkerColor(tipo);
  return L.divIcon({
    html: `<div style="
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid rgba(255,255,255,0.6);
      box-shadow: 0 0 4px ${color}80;
    "></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  });
}

function createClusterIcon(cluster: any): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count > 100 ? 48 : count > 50 ? 40 : count > 20 ? 36 : 32;
  return L.divIcon({
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.7);
      border: 2px solid rgba(192, 132, 252, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: ${size > 40 ? 13 : 11}px;
      font-family: system-ui;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    ">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface AuctionMapProps {
  auctions: Auction[];
}

export default function AuctionMap({ auctions }: AuctionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<anyGroup | null>(null);

  // Compute marker data
  const markers = useMemo(() => {
    return auctions
      .map((auction) => {
        const coords = getAuctionCoordinates(
          auction.lat,
          auction.lng,
          auction.provincia,
          auction.municipio
        );
        if (!coords) return null;
        return { auction, coords };
      })
      .filter(Boolean) as { auction: Auction; coords: { lat: number; lng: number } }[];
  }, [auctions]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [40.0, -3.7],
        zoom: 6,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Create cluster group
      const clusterGroup = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: createClusterIcon,
      }) as anyGroup;

      clusterGroupRef.current = clusterGroup;
      map.addLayer(clusterGroup);
    }

    const map = mapInstanceRef.current;
    const clusterGroup = clusterGroupRef.current!;

    // Clear existing markers
    clusterGroup.clearLayers();

    // Add markers
    const bounds: L.LatLngBounds = L.latLngBounds([]);

    for (const { auction, coords } of markers) {
      const icon = createMarkerIcon(auction.tipo_bien);
      const marker = L.marker([coords.lat, coords.lng], { icon });

      const title = auction.provincia && auction.municipio
        ? `${auction.municipio}, ${auction.provincia}`
        : auction.provincia || auction.municipio || '';
      const price = formatPrice(auction.valor_subasta);
      const tipo = auction.tipo_bien || '';

      marker.bindPopup(`
        <div style="min-width: 180px; font-family: system-ui; color: #1e293b;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; line-height: 1.3;">
            ${title}
          </div>
          ${tipo ? `<div style="font-size: 11px; color: #64748b; text-transform: capitalize; margin-bottom: 6px;">${tipo.replace(/_/g, ' ')}</div>` : ''}
          <div style="font-size: 14px; font-weight: 600; color: #7c3aed;">
            ${price}
          </div>
          ${auction.url_detalle ? `<a href="${auction.url_detalle}" target="_blank" rel="noopener" style="font-size: 11px; color: #6366f1; text-decoration: underline; display: inline-block; margin-top: 4px;">Ver detalle →</a>` : ''}
        </div>
      `);

      clusterGroup.addLayer(marker);
      bounds.extend([coords.lat, coords.lng]);
    }

    // Fit bounds if we have markers
    if (markers.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }

    // Invalidate size after mount (helps with hidden containers)
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      // Cleanup on unmount only
    };
  }, [markers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        clusterGroupRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-navy-600">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />
      <div className="absolute bottom-3 left-3 bg-navy-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-navy-600">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {[
            { tipo: 'vivienda', label: 'Viviendas', color: '#3b82f6' },
            { tipo: 'garaje', label: 'Garajes', color: '#6b7280' },
            { tipo: 'solar', label: 'Solares', color: '#22c55e' },
            { tipo: 'vehiculo', label: 'Coches', color: '#f97316' },
            { tipo: 'local', label: 'Locales', color: '#ec4899' },
            { tipo: 'finca_rustica', label: 'Fincas', color: '#a3e635' },
          ].map((item) => (
            <div key={item.tipo} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
