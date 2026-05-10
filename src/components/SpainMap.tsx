'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface SpainMapProps {
  auctionCounts: Record<string, number>;
}

// Real province positions from GeoJSON centroids, mapped to SVG viewport
const PROVINCE_CENTERS: Record<string, { x: number; y: number }> = {
  'Coruña': { x: 53, y: 63 },
  'Lugo': { x: 88, y: 53 },
  'Ourense': { x: 84, y: 87 },
  'Pontevedra': { x: 52, y: 83 },
  'Asturias': { x: 117, y: 47 },
  'Cantabria': { x: 179, y: 53 },
  'Vizcaya': { x: 207, y: 54 },
  'Guipúzcoa': { x: 220, y: 57 },
  'Álava': { x: 205, y: 68 },
  'Navarra': { x: 235, y: 73 },
  'Rioja': { x: 214, y: 84 },
  'Huesca': { x: 273, y: 87 },
  'Zaragoza': { x: 252, y: 102 },
  'Teruel': { x: 256, y: 132 },
  'Lleida': { x: 305, y: 92 },
  'Barcelona': { x: 325, y: 98 },
  'Girona': { x: 356, y: 92 },
  'Tarragona': { x: 296, y: 128 },
  'Castellón': { x: 283, y: 151 },
  'Valencia': { x: 255, y: 168 },
  'Alicante': { x: 267, y: 199 },
  'Murcia': { x: 253, y: 219 },
  'Albacete': { x: 228, y: 187 },
  'Cuenca': { x: 219, y: 151 },
  'Guadalajara': { x: 206, y: 129 },
  'Madrid': { x: 180, y: 141 },
  'Toledo': { x: 171, y: 156 },
  'Ciudad Real': { x: 177, y: 180 },
  'Badajoz': { x: 122, y: 187 },
  'Cáceres': { x: 118, y: 160 },
  'Salamanca': { x: 123, y: 129 },
  'Zamora': { x: 124, y: 101 },
  'Valladolid': { x: 151, y: 100 },
  'Palencia': { x: 164, y: 82 },
  'Burgos': { x: 186, y: 79 },
  'Soria': { x: 212, y: 105 },
  'Segovia': { x: 175, y: 115 },
  'Ávila': { x: 151, y: 136 },
  'León': { x: 128, y: 75 },
  'Huelva': { x: 105, y: 223 },
  'Sevilla': { x: 136, y: 227 },
  'Cádiz': { x: 129, y: 257 },
  'Córdoba': { x: 153, y: 215 },
  'Jaén': { x: 187, y: 210 },
  'Granada': { x: 196, y: 231 },
  'Málaga': { x: 155, y: 244 },
  'Almería': { x: 228, y: 234 },
  'Baleares': { x: 344, y: 170 },
  'Las Palmas': { x: 95, y: 285 },
  'Santa Cruz de Tenerife': { x: 65, y: 285 },
};

// Real Spain outline from GeoJSON convex hull (simplified)
const SPAIN_OUTLINE = 'M40,62 L52,66 L87,233 L88,235 L123,265 L129,268 L134,270 L199,272 L229,234 L253,219 L267,199 L283,151 L296,128 L305,92 L325,98 L356,92 L361,84 L357,80 L353,79 L231,40 L179,53 L151,47 L117,47 L88,53 L53,63 Z';

// Portugal outline (simplified)
const PORTUGAL_OUTLINE = 'M52,63 L40,62 L40,66 L52,83 L84,87 L88,53 L84,87 L123,101 L123,129 L122,187 L105,223 L88,235 L87,233 L84,87 L52,83 L52,63 Z';

export default function SpainMap({ auctionCounts }: SpainMapProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const maxCount = useMemo(() => {
    const vals = Object.values(auctionCounts).filter(v => v > 0);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [auctionCounts]);

  const getRadius = (count: number) => {
    if (count === 0) return 3;
    return Math.max(4, Math.min(15, 4 + (count / maxCount) * 11));
  };

  const getColor = (count: number) => {
    if (count === 0) return '#374151';
    const r = count / maxCount;
    if (r > 0.6) return '#a78bfa';
    if (r > 0.3) return '#7c3aed';
    return '#6d28d9';
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <svg viewBox="0 0 400 310" className="w-full" style={{ minHeight: '260px' }}>
        {/* Subtle grid */}
        {Array.from({length:6}, (_,i) => (
          <line key={`h${i}`} x1="35" y1={40+i*45} x2="370" y2={40+i*45} stroke="#1e293b" strokeWidth="0.3" />
        ))}
        {Array.from({length:8}, (_,i) => (
          <line key={`v${i}`} x1={40+i*45} y1="35" x2={40+i*45} y2="275" stroke="#1e293b" strokeWidth="0.3" />
        ))}

        {/* Portugal */}
        <path d={PORTUGAL_OUTLINE} fill="#0c1222" stroke="#1e3a5f" strokeWidth="0.8" />

        {/* Spain mainland */}
        <path d={SPAIN_OUTLINE} fill="#111827" stroke="#334155" strokeWidth="1.2" />

        {/* Baleares */}
        <ellipse cx="344" cy="170" rx="20" ry="14" fill="#111827" stroke="#334155" strokeWidth="1" />

        {/* Canary Islands inset */}
        <rect x="48" y="270" width="120" height="32" rx="3" fill="none" stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="4,2" />
        <text x="108" y="268" textAnchor="middle" fill="#475569" fontSize="6">Canarias</text>

        {/* Province dots */}
        {Object.entries(PROVINCE_CENTERS).map(([province, center]) => {
          const count = auctionCounts[province] || 0;
          const r = getRadius(count);
          const color = getColor(count);
          const isH = hovered === province;

          return (
            <g
              key={province}
              onClick={() => router.push(`/buscar?provincia=${encodeURIComponent(province)}`)}
              onMouseEnter={() => setHovered(province)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              {isH && <circle cx={center.x} cy={center.y} r={r + 8} fill={color} opacity="0.15" />}
              <circle
                cx={center.x} cy={center.y} r={r}
                fill={color}
                stroke={isH ? '#e2e8f0' : color}
                strokeWidth={isH ? 1.5 : 0.5}
                opacity={count === 0 ? 0.25 : 0.85}
              />
            </g>
          );
        })}

        {/* Tooltip */}
        {hovered && PROVINCE_CENTERS[hovered] && (() => {
          const c = PROVINCE_CENTERS[hovered];
          const count = auctionCounts[hovered] || 0;
          const tx = Math.min(Math.max(c.x, 65), 335);
          const ty = c.y - 28;
          return (
            <g>
              <rect x={tx - 52} y={ty - 10} width="104" height="20" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
              <text x={tx} y={ty + 4} textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="600">
                {hovered}: {count} subastas
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-1 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-700 inline-block"></span> Sin datos</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-800 inline-block"></span> Pocas</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-violet-400 inline-block"></span> Muchas</span>
      </div>
    </div>
  );
}
