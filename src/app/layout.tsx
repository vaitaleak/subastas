import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'SubastasPúblicas.es - Subastas Públicas de España',
  description:
    'Encuentra subastas públicas de viviendas, garajes, solares, coches y más. Gratis, sin registro, actualizado cada día. Subastas del BOE, Agencia Tributaria y Seguridad Social.',
  keywords: [
    'subastas públicas',
    'subastas España',
    'subastas BOE',
    'subastas judiciales',
    'subastas hacienda',
    'viviendas subasta',
    'pisos subasta',
  ],
  openGraph: {
    title: 'SubastasPúblicas.es - Todas las Subastas Públicas de España',
    description:
      'Gratis. Sin registro. Actualizado cada día. Encuentra subastas de viviendas, garajes, solares y más.',
    type: 'website',
    locale: 'es_ES',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-navy-900 text-slate-200 font-sans">
        {/* Navigation header */}
        <header className="sticky top-0 z-30 border-b border-navy-700/50 bg-navy-900/80 backdrop-blur-xl">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="text-lg font-bold text-white group-hover:text-accent-400 transition-colors">
                Subastas<span className="text-accent-500">Públicas</span>
              </span>
            </a>
            <div className="flex items-center gap-4">
              <Link
                href="/buscar"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Buscar subastas
              </a>
              <Link
                href="/buscar"
                className="sm:hidden p-2 text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </a>
            </div>
          </nav>
        </header>

        {/* Main content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="border-t border-navy-700/50 bg-navy-950/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center text-white font-bold text-sm">
                    S
                  </div>
                  <span className="text-lg font-bold text-white">
                    Subastas<span className="text-accent-500">Públicas</span>.es
                  </span>
                </div>
                <p className="text-slate-500 text-sm max-w-md">
                  Portal gratuito de subastas públicas en España. Información recopilada del BOE, 
                  Agencia Tributaria y Seguridad Social. Actualizado diariamente.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Navegación</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/" className="text-slate-500 hover:text-accent-400 transition-colors">Inicio</Link></li>
                  <li><Link href="/buscar" className="text-slate-500 hover:text-accent-400 transition-colors">Buscar subastas</Link></li>
                  <li><Link href="/buscar?tipo_bien=vivienda" className="text-slate-500 hover:text-accent-400 transition-colors">Viviendas</Link></li>
                  <li><Link href="/buscar?tipo_bien=garaje" className="text-slate-500 hover:text-accent-400 transition-colors">Garajes</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Fuentes</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="https://subastas.boe.es" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-accent-400 transition-colors">BOE Subastas</a></li>
                  <li><a href="https://www1.agenciatributaria.es" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-accent-400 transition-colors">Agencia Tributaria</a></li>
                  <li><a href="https://www.seg-social.es" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-accent-400 transition-colors">Seguridad Social</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-navy-800 text-center text-xs text-slate-600">
              © {new Date().getFullYear()} SubastasPúblicas.es — Información orientativa. Consulta siempre la fuente oficial.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
