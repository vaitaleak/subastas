'use client';

import { useState, useCallback } from 'react';
import { PROVINCE_LIST, TIPO_BIEN_LIST, SOURCE_LIST } from '@/lib/utils';
import type { AuctionFilters } from '@/lib/types';

interface FilterPanelProps {
  filters: AuctionFilters;
  onFilterChange: (filters: AuctionFilters) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

export default function FilterPanel({ filters, onFilterChange, onClose, isOpen = true }: FilterPanelProps) {
  const updateFilter = useCallback(
    (key: keyof AuctionFilters, value: string | number | undefined) => {
      onFilterChange({ ...filters, [key]: value || undefined, page: 1 });
    },
    [filters, onFilterChange]
  );

  const resetFilters = useCallback(() => {
    onFilterChange({ page: 1 });
  }, [onFilterChange]);

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v != null && v !== '' && k !== 'page' && k !== 'sort'
  ).length;

  const content = (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros
          {activeCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-accent-500 text-white font-medium">
              {activeCount}
            </span>
          )}
        </h2>
        {onClose && (
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors lg:hidden">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Provincia */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1.5">Provincia</label>
        <select
          value={filters.provincia || ''}
          onChange={(e) => updateFilter('provincia', e.target.value)}
          className="input text-sm"
        >
          <option value="">Todas las provincias</option>
          {PROVINCE_LIST.map((p) => (
            <option key={p.code} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tipo de bien */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1.5">Tipo de bien</label>
        <select
          value={filters.tipo_bien || ''}
          onChange={(e) => updateFilter('tipo_bien', e.target.value)}
          className="input text-sm"
        >
          <option value="">Todos los tipos</option>
          {TIPO_BIEN_LIST.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Origen */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1.5">Origen</label>
        <select
          value={filters.source || ''}
          onChange={(e) => updateFilter('source', e.target.value)}
          className="input text-sm"
        >
          <option value="">Todos los orígenes</option>
          {SOURCE_LIST.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Precio */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1.5">Precio</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Mín €"
            value={filters.precio_min || ''}
            onChange={(e) => updateFilter('precio_min', e.target.value ? Number(e.target.value) : undefined)}
            className="input text-sm"
          />
          <input
            type="number"
            placeholder="Máx €"
            value={filters.precio_max || ''}
            onChange={(e) => updateFilter('precio_max', e.target.value ? Number(e.target.value) : undefined)}
            className="input text-sm"
          />
        </div>
      </div>

      {/* Estado */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1.5">Estado</label>
        <select
          value={filters.estado || ''}
          onChange={(e) => updateFilter('estado', e.target.value)}
          className="input text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="activa">Activa</option>
          <option value="proxima">Próxima</option>
          <option value="finalizada">Finalizada</option>
        </select>
      </div>

      {/* Ordenar por */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1.5">Ordenar por</label>
        <select
          value={filters.sort || ''}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="input text-sm"
        >
          <option value="">Relevancia</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="fecha_fin_asc">Fecha fin: más próximas</option>
          <option value="fecha_fin_desc">Fecha fin: más lejanas</option>
          <option value="fecha_pub_desc">Más recientes</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button onClick={resetFilters} className="btn-secondary flex-1 text-sm">
          Limpiar
        </button>
        {onClose && (
          <button onClick={onClose} className="btn-primary flex-1 text-sm lg:hidden">
            Aplicar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0">
        <div className="sticky top-20 card-static overflow-hidden">{content}</div>
      </aside>

      {/* Mobile drawer */}
      {isOpen && onClose && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="drawer-overlay" onClick={onClose} />
          <div className="drawer-panel animate-slide-in-left">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
