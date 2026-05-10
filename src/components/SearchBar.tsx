'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  initialValue?: string;
  onSearch?: (query: string) => void;
  className?: string;
  large?: boolean;
}

export default function SearchBar({ initialValue = '', onSearch, className = '', large = false }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const router = useRouter();

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch && value !== initialValue) {
        onSearch(value);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, onSearch, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(value);
    } else {
      const params = new URLSearchParams();
      if (value.trim()) params.set('query', value.trim());
      router.push(`/buscar${params.toString() ? '?' + params.toString() : ''}`);
    }
  };

  const handleClear = () => {
    setValue('');
    if (onSearch) onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className={`relative flex items-center ${large ? 'gap-3' : 'gap-2'}`}>
        <div className="relative flex-1">
          <svg
            className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 ${large ? 'w-5 h-5' : 'w-4 h-4'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Buscar por municipio, dirección, referencia catastral..."
            className={`w-full bg-navy-800 border border-navy-600 rounded-xl text-slate-200
                        placeholder-slate-500 focus:outline-none focus:border-accent-500
                        focus:ring-2 focus:ring-accent-500/30 transition-all duration-200
                        ${large ? 'pl-12 pr-10 py-4 text-lg' : 'pl-10 pr-9 py-2.5 text-sm'}`}
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors
                          ${large ? 'p-1' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="submit"
          className={`${large ? 'px-8 py-4 text-lg rounded-xl' : 'px-5 py-2.5 text-sm rounded-lg'}
                      bg-accent-500 hover:bg-accent-600 text-white font-medium
                      transition-all duration-200 active:scale-[0.98]
                      focus:outline-none focus:ring-2 focus:ring-accent-500/50
                      whitespace-nowrap`}
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
