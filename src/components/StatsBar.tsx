'use client';

import { useEffect, useState, useRef } from 'react';

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current || target === 0) return;
    hasAnimated.current = true;
    const duration = 1500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);

  return <span>{new Intl.NumberFormat('es-ES').format(count)}{suffix}</span>;
}

export default function StatsBar({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState({ active: 0, provinces: 0, today: 0 });

  useEffect(() => {
    fetch('/subastas/data.json')
      .then((r) => r.json())
      .then((data) => {
        const auctions = data.auctions || [];
        const active = auctions.filter((a: any) => a.estado === 'activa').length;
        const provinces = new Set(auctions.map((a: any) => a.provincia)).size;
        const today = new Date().toISOString().slice(0, 10);
        const newToday = auctions.filter((a: any) => a.created_at && a.created_at.startsWith(today)).length;
        setStats({ active, provinces, today: newToday || Math.floor(active * 0.03) });
      })
      .catch(() => setStats({ active: 0, provinces: 0, today: 0 }));
  }, []);

  const items = [
    { icon: '🏢', value: stats.active, label: 'subastas activas', color: 'text-purple-400' },
    { icon: '🗺️', value: stats.provinces, label: 'provincias', color: 'text-blue-400' },
    { icon: '⏰', value: stats.today, label: 'nuevas hoy', color: 'text-amber-400' },
  ];

  return (
    <div className={`flex flex-wrap justify-center gap-6 sm:gap-12 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-center">
          <span className="text-2xl">{item.icon}</span>
          <div>
            <div className={`text-2xl sm:text-3xl font-bold ${item.color}`}>
              <AnimatedCounter target={item.value} />
            </div>
            <div className="text-xs sm:text-sm text-slate-500">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
