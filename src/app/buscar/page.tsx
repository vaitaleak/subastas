import { Suspense } from 'react';
import BuscarContent from '@/components/BuscarContent';

export default function BuscarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Cargando...</div>
      </div>
    }>
      <BuscarContent />
    </Suspense>
  );
}
