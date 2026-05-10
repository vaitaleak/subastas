'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface SpainMapProps {
  auctionCounts: Record<string, number>;
}

// Province capitals with approximate map coordinates (x,y) on a 400x320 canvas
// Spain bounding box: roughly 9.3W to 3.3E, 36N to 43.8N
const PROVINCE_CENTERS: Record<string, { x: number; y: number; name: string }> = {
  'Coruña': { x: 65, y: 115, name: 'A Coruña' },
  'Lugo': { x: 95, y: 105, name: 'Lugo' },
  'Ourense': { x: 100, y: 140, name: 'Ourense' },
  'Pontevedra': { x: 68, y: 145, name: 'Pontevedra' },
  'Asturias': { x: 130, y: 90, name: 'Asturias' },
  'Cantabria': { x: 160, y: 78, name: 'Cantabria' },
  'Vizcaya': { x: 178, y: 78, name: 'Bizkaia' },
  'Guipúzcoa': { x: 198, y: 72, name: 'Gipuzkoa' },
  'Álava': { x: 182, y: 85, name: 'Álava' },
  'Navarra': { x: 215, y: 82, name: 'Navarra' },
  'Rioja': { x: 205, y: 98, name: 'La Rioja' },
  'Huesca': { x: 245, y: 85, name: 'Huesca' },
  'Zaragoza': { x: 245, y: 115, name: 'Zaragoza' },
  'Teruel': { x: 265, y: 140, name: 'Teruel' },
  'Lleida': { x: 252, y: 100, name: 'Lleida' },
  'Barcelona': { x: 275, y: 100, name: 'Barcelona' },
  'Girona': { x: 282, y: 82, name: 'Girona' },
  'Tarragona': { x: 268, y: 118, name: 'Tarragona' },
  'Castellón': { x: 272, y: 138, name: 'Castellón' },
  'Valencia': { x: 278, y: 155, name: 'Valencia' },
  'Alicante': { x: 272, y: 180, name: 'Alicante' },
  'Murcia': { x: 275, y: 200, name: 'Murcia' },
  'Albacete': { x: 248, y: 175, name: 'Albacete' },
  'Cuenca': { x: 235, y: 145, name: 'Cuenca' },
  'Guadalajara': { x: 215, y: 125, name: 'Guadalajara' },
  'Madrid': { x: 205, y: 145, name: 'Madrid' },
  'Toledo': { x: 192, y: 155, name: 'Toledo' },
  'Ciudad Real': { x: 200, y: 190, name: 'Ciudad Real' },
  'Badajoz': { x: 145, y: 175, name: 'Badajoz' },
  'Cáceres': { x: 140, y: 155, name: 'Cáceres' },
  'Salamanca': { x: 155, y: 135, name: 'Salamanca' },
  'Zamora': { x: 145, y: 115, name: 'Zamora' },
  'Valladolid': { x: 168, y: 110, name: 'Valladolid' },
  'Palencia': { x: 172, y: 98, name: 'Palencia' },
  'Burgos': { x: 190, y: 92, name: 'Burgos' },
  'Soria': { x: 210, y: 105, name: 'Soria' },
  'Segovia': { x: 180, y: 128, name: 'Segovia' },
  'Ávila': { x: 172, y: 140, name: 'Ávila' },
  'León': { x: 140, y: 100, name: 'León' },
  'Zamora': { x: 148, y: 120, name: 'Zamora' },
  'Huelva': { x: 135, y: 205, name: 'Huelva' },
  'Sevilla': { x: 155, y: 200, name: 'Sevilla' },
  'Cádiz': { x: 148, y: 225, name: 'Cádiz' },
  'Córdoba': { x: 195, y: 205, name: 'Córdoba' },
  'Jaén': { x: 225, y: 210, name: 'Jaén' },
  'Granada': { x: 242, y: 220, name: 'Granada' },
  'Málaga': { x: 215, y: 235, name: 'Málaga' },
  'Almería': { x: 260, y: 225, name: 'Almería' },
  'Baleares': { x: 345, y: 155, name: 'Baleares' },
  'Las Palmas': { x: 115, y: 275, name: 'Las Palmas' },
  'Santa Cruz de Tenerife': { x: 80, y: 275, name: 'Sta. Cruz Tenerife' },
};

// Simplified Spain mainland outline path
const SPAIN_OUTLINE = 'M130,65 L160,60 L185,62 L210,58 L235,62 L250,68 L265,72 L285,68 L295,75 L290,85 L285,95 L290,105 L295,115 L290,130 L285,145 L288,160 L282,175 L278,190 L280,205 L270,220 L260,235 L245,242 L230,248 L215,250 L200,245 L185,250 L170,248 L155,240 L140,230 L130,215 L125,200 L115,190 L108,175 L100,160 L95,140 L90,120 L95,100 L105,85 L115,75 Z';

// Portugal outline (simplified, to show the border)
const PORTUGAL_OUTLINE = 'M130,85 L118,95 L108,110 L100,130 L98,150 L105,170 L110,185 L118,200 L125,215 L135,230 L130,240 L120,235 L112,220 L105,200 L100,180 L95,155 L90,130 L92,110 L100,92 L112,80 L125,75 Z';

export default function SpainMap({ auctionCounts }: SpainMapProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const maxCount = useMemo(() => {
    const vals = Object.values(auctionCounts);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [auctionCounts]);

  const getDotRadius = (count: number) => {
    if (count === 0) return 3;
    return Math.max(4, Math.min(14, 4 + (count / maxCount) * 10));
  };

  const getDotColor = (count: number) => {
    if (count === 0) return '#4b5563';
    const ratio = count / maxCount;
    if (ratio > 0.7) return '#a78bfa';
    if (ratio > 0.4) return '#8b5cf6';
    if (ratio > 0.2) return '#7c3aed';
    return '#6d28d9';
  };

  const handleClick = (province: string) => {
    router.push(`/buscar?provincia=${encodeURIComponent(province)}`);
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="flex justify-center">
        <svg viewBox="0 0 400 310" className="w-full max-w-2xl" style={{ minHeight: '280px' }}>
          {/* Background */}
          <rect x="0" y="0" width="400" height="310" fill="transparent" />

          {/* Subtle grid */}
          {[50,100,150,200,250,300].map(y => (
            <line key={`h${y}`} x1="30" y1={y} x2="360" y2={y} stroke="#1e293b" strokeWidth="0.5" />
          ))}
          {[80,130,180,230,280,330].map(x => (
            <line key={`v${x}`} x1={x} y1="40" x2={x} y2="260" stroke="#1e293b" strokeWidth="0.5" />
          ))}

          {/* Portugal outline */}
          <path d={PORTUGAL_OUTLINE} fill="#0f172a" stroke="#334155" strokeWidth="1" opacity="0.6" />

          {/* Spain mainland outline */}
          <path d={SPAIN_OUTLINE} fill="#1e293b" stroke="#475569" strokeWidth="1.5" opacity="0.8" />

          {/* Province dots */}
          {Object.entries(PROVINCE_CENTERS).map(([province, center]) => {
            const count = auctionCounts[province] || 0;
            const r = getDotRadius(count);
            const color = getDotColor(count);
            const isHovered = hovered === province;

            return (
              <g
                key={province}
                onClick={() => handleClick(province)}
                onMouseEnter={() => setHovered(province)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow effect on hover */}
                {isHovered && (
                  <circle cx={center.x} cy={center.y} r={r + 6} fill={color} opacity="0.2" />
                )}
                <circle
                  cx={center.x}
                  cy={center.y}
                  r={r}
                  fill={color}
                  stroke={isHovered ? '#fff' : color}
                  strokeWidth={isHovered ? 1.5 : 0.5}
                  opacity={count === 0 ? 0.3 : 0.9}
                />
              </g>
            );
          })}

          {/* Baleares outline */}
          <ellipse cx="345" cy="155" rx="18" ry="12" fill="#1e293b" stroke="#475569" strokeWidth="1" opacity="0.8" />

          {/* Canary Islands inset box */}
          <rect x="55" y="260" width="110" height="40" rx="4" fill="none" stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
          <text x="110" y="258" textAnchor="middle" fill="#64748b" fontSize="7">Canarias</text>

          {/* Tooltip */}
          {hovered && PROVINCE_CENTERS[hovered] && (
            <g>
              <rect
                x={PROVINCE_CENTERS[hovered].x - 55}
                y={PROVINCE_CENTERS[hovered].y - 32}
                width="110"
                height="22"
                rx="4"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="0.5"
              />
              <text
                x={PROVINCE_CENTERS[hovered].x}
                y={PROVINCE_CENTERS[hovered].y - 18}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="9"
                fontWeight="600"
              >
                {PROVINCE_CENTERS[hovered].name}: {auctionCounts[hovered] || 0} subastas
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-600"></span> Sin datos
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-violet-700"></span> Pocas
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded-full bg-violet-400"></span> Muchas
        </div>
      </div>
    </div>
  );
}
