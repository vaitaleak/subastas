'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface SpainMapProps {
  auctionCounts: Record<string, number>;
}

// Simplified SVG paths for Spain's provinces (approximate boundaries)
// These are the main recognizable shapes for the Iberian Peninsula provinces
const PROVINCE_PATHS: Record<string, string> = {
  'Álava': 'M215,125 L230,118 L245,120 L250,130 L240,140 L225,138 L215,132 Z',
  'Albacete': 'M265,185 L285,180 L300,190 L305,210 L290,220 L270,215 L260,200 Z',
  'Alicante': 'M295,190 L310,185 L320,195 L325,210 L310,220 L295,215 L290,200 Z',
  'Almería': 'M270,230 L290,225 L305,235 L300,255 L285,260 L270,250 Z',
  'Ávila': 'M195,145 L215,140 L225,150 L220,170 L200,175 L190,160 Z',
  'Badajoz': 'M145,175 L175,165 L195,170 L200,190 L185,200 L155,195 L140,185 Z',
  'Baleares': 'M370,175 L380,170 L395,175 L395,185 L385,190 L372,188 Z',
  'Barcelona': 'M285,120 L300,115 L310,125 L305,140 L290,145 L280,135 Z',
  'Burgos': 'M200,95 L230,90 L250,100 L245,120 L225,125 L205,118 L195,108 Z',
  'Cáceres': 'M135,175 L155,165 L180,165 L195,180 L185,200 L160,200 L140,195 Z',
  'Cádiz': 'M185,245 L210,240 L225,250 L220,265 L200,270 L185,262 Z',
  'Castellón': 'M285,135 L300,130 L310,140 L305,155 L290,158 L280,148 Z',
  'Ciudad Real': 'M195,185 L220,180 L250,185 L260,200 L250,220 L225,225 L200,215 L190,200 Z',
  'Córdoba': 'M215,210 L235,205 L250,215 L245,235 L230,240 L215,230 Z',
  'Coruña': 'M80,115 L100,105 L115,115 L110,135 L95,140 L78,132 Z',
  'Cuenca': 'M255,145 L275,140 L290,150 L285,170 L270,175 L255,165 Z',
  'Girona': 'M290,105 L310,98 L325,105 L320,120 L305,125 L290,118 Z',
  'Granada': 'M255,225 L270,220 L285,230 L280,250 L265,255 L250,242 Z',
  'Guadalajara': 'M220,130 L245,128 L260,138 L255,155 L235,158 L220,148 Z',
  'Guipúzcoa': 'M235,100 L250,92 L265,95 L262,108 L248,112 L237,108 Z',
  'Huelva': 'M145,210 L170,205 L190,215 L185,240 L170,248 L148,240 L140,225 Z',
  'Huesca': 'M260,95 L280,88 L300,95 L295,112 L278,118 L262,112 Z',
  'Jaén': 'M240,220 L258,215 L270,225 L265,242 L250,245 L238,235 Z',
  'León': 'M140,100 L165,95 L185,105 L180,125 L165,132 L145,128 L135,115 Z',
  'Lleida': 'M265,112 L285,108 L298,118 L292,132 L278,135 L265,128 Z',
  'Rioja': 'M220,105 L240,100 L252,108 L248,118 L232,122 L220,115 Z',
  'Lugo': 'M95,108 L120,100 L140,108 L138,128 L122,135 L100,130 L90,118 Z',
  'Madrid': 'M205,148 L220,145 L230,155 L225,168 L212,170 L205,160 Z',
  'Málaga': 'M225,248 L245,242 L260,250 L255,268 L240,272 L225,262 Z',
  'Murcia': 'M285,200 L305,195 L320,205 L315,225 L300,230 L285,220 Z',
  'Navarra': 'M248,95 L268,90 L280,98 L275,110 L258,115 L248,108 Z',
  'Ourense': 'M105,130 L125,125 L140,132 L140,150 L128,158 L110,155 L100,142 Z',
  'Asturias': 'M130,95 L155,90 L175,98 L170,112 L152,115 L135,110 Z',
  'Palencia': 'M188,100 L208,95 L220,105 L215,120 L198,125 L188,115 Z',
  'Las Palmas': 'M215,300 L230,295 L250,300 L248,315 L230,318 L215,312 Z',
  'Pontevedra': 'M80,135 L102,130 L115,140 L110,158 L95,162 L78,155 L75,145 Z',
  'Salamanca': 'M150,135 L170,128 L190,135 L195,155 L182,162 L160,160 L148,150 Z',
  'Santa Cruz de Tenerife': 'M175,305 L195,300 L215,308 L210,320 L192,322 L175,315 Z',
  'Cantabria': 'M170,85 L192,82 L210,90 L208,100 L192,105 L175,98 Z',
  'Segovia': 'M188,125 L208,120 L220,130 L218,148 L205,150 L190,142 Z',
  'Sevilla': 'M185,215 L210,210 L230,220 L225,240 L208,245 L188,235 Z',
  'Soria': 'M235,115 L255,110 L270,118 L268,135 L252,140 L238,132 Z',
  'Tarragona': 'M282,125 L298,120 L308,130 L305,145 L292,148 L280,140 Z',
  'Teruel': 'M265,135 L285,130 L300,140 L298,158 L282,162 L268,155 Z',
  'Toledo': 'M190,160 L212,155 L230,165 L225,182 L208,185 L192,175 Z',
  'Valencia': 'M300,155 L318,150 L328,162 L325,180 L310,185 L298,175 Z',
  'Valladolid': 'M172,105 L192,100 L208,110 L205,125 L188,130 L172,122 Z',
  'Bizkaia': 'M205,85 L225,82 L240,90 L235,100 L220,105 L208,98 Z',
  'Zamora': 'M135,120 L155,115 L175,122 L172,140 L158,145 L140,140 L132,132 Z',
  'Zaragoza': 'M265,118 L288,112 L305,122 L300,142 L282,148 L268,140 Z',
  'Ceuta': 'M265,272 L275,268 L282,275 L278,282 L268,282 Z',
  'Melilla': 'M315,258 L325,255 L332,262 L328,270 L318,268 Z',
};

const SPAIN_VIEWBOX = '70 80 330 250';

export default function SpainMap({ auctionCounts }: SpainMapProps) {
  const router = useRouter();
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Compute max count for heatmap scaling
  const maxCount = useMemo(() => {
    const values = Object.values(auctionCounts);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [auctionCounts]);

  const getColor = (province: string): string => {
    const count = auctionCounts[province] || 0;
    if (count === 0) return '#1e293b'; // slate-800

    const intensity = Math.max(0.15, count / maxCount);
    // Purple heatmap: from dark to bright purple
    const r = Math.round(88 + (168 - 88) * intensity);
    const g = Math.round(28 + (85 - 28) * intensity);
    const b = Math.round(135 + (247 - 135) * intensity);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getStrokeColor = (province: string): string => {
    return hoveredProvince === province ? '#c084fc' : '#334155';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as SVGSVGElement).closest('div')?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top - 10,
      });
    }
  };

  const handleClick = (province: string) => {
    router.push(`/buscar?provincia=${encodeURIComponent(province)}`);
  };

  return (
    <div className="relative w-full h-full min-h-[350px]">
      <svg
        viewBox={SPAIN_VIEWBOX}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        onMouseMove={handleMouseMove}
      >
        {/* Background */}
        <rect x="70" y="80" width="330" height="250" fill="transparent" />

        {/* Province shapes */}
        {Object.entries(PROVINCE_PATHS).map(([province, path]) => (
          <path
            key={province}
            d={path}
            fill={getColor(province)}
            stroke={getStrokeColor(province)}
            strokeWidth={hoveredProvince === province ? 2 : 0.5}
            style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
            onMouseEnter={() => setHoveredProvince(province)}
            onMouseLeave={() => setHoveredProvince(null)}
            onClick={() => handleClick(province)}
          />
        ))}

        {/* Legend */}
        <g transform="translate(80, 295)">
          <text x="0" y="0" fill="#94a3b8" fontSize="8" fontFamily="system-ui">Menos</text>
          <rect x="30" y="-7" width="12" height="8" fill="#1e293b" stroke="#334155" strokeWidth="0.3" />
          <rect x="44" y="-7" width="12" height="8" fill="rgb(110, 40, 160)" />
          <rect x="58" y="-7" width="12" height="8" fill="rgb(140, 60, 200)" />
          <rect x="72" y="-7" width="12" height="8" fill="rgb(168, 85, 247)" />
          <text x="88" y="0" fill="#94a3b8" fontSize="8" fontFamily="system-ui">Más</text>
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredProvince && (
        <div
          className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg bg-navy-900/95 border border-navy-600 shadow-lg backdrop-blur-sm"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(0, -100%)',
          }}
        >
          <p className="text-sm font-semibold text-white">{hoveredProvince}</p>
          <p className="text-xs text-accent-400">
            {auctionCounts[hoveredProvince] || 0} subasta{(auctionCounts[hoveredProvince] || 0) !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
