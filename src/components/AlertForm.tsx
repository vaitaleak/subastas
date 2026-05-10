'use client';

import { useState } from 'react';
import type { AuctionFilters } from '@/lib/types';

interface AlertFormProps {
  prefilledFilters?: AuctionFilters;
  onSuccess?: () => void;
}

export default function AlertForm({ prefilledFilters, onSuccess }: AlertFormProps) {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<'diaria' | 'semanal'>('diaria');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          filters: prefilledFilters || {},
          frequency,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al crear la alerta');
      }

      setSuccess(true);
      setEmail('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Error al crear la alerta');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card-static p-5 text-center space-y-3 animate-fade-in">
        <div className="w-12 h-12 mx-auto rounded-full bg-success-500/10 border border-success-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-white font-semibold">¡Alerta creada!</h3>
        <p className="text-sm text-slate-400">
          Te enviaremos un email cuando haya subastas nuevas que coincidan con tus filtros.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="btn-ghost text-sm"
        >
          Crear otra alerta
        </button>
      </div>
    );
  }

  return (
    <div className="card-static p-5 space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Crear alerta de subastas
      </h3>
      <p className="text-sm text-slate-500">
        Recibe un email cuando haya subastas nuevas que coincidan con tus filtros.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="input text-sm"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFrequency('diaria')}
            className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
              frequency === 'diaria'
                ? 'bg-accent-500/15 border-accent-500/30 text-accent-300'
                : 'bg-navy-800 border-navy-600 text-slate-400 hover:border-navy-500'
            }`}
          >
            📬 Diaria
          </button>
          <button
            type="button"
            onClick={() => setFrequency('semanal')}
            className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
              frequency === 'semanal'
                ? 'bg-accent-500/15 border-accent-500/30 text-accent-300'
                : 'bg-navy-800 border-navy-600 text-slate-400 hover:border-navy-500'
            }`}
          >
            📅 Semanal
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creando...
            </>
          ) : (
            '🔔 Crear alerta'
          )}
        </button>
      </form>
    </div>
  );
}
