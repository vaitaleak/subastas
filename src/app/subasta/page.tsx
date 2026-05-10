import { Suspense } from 'react';
import SubastaClient from '@/components/SubastaClient';

export const metadata = {
  title: 'Detalle de Subasta - SubastasPúblicas.es',
  description: 'Información detallada de la subasta pública.',
};

export default function SubastaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando subasta...</p>
        </div>
      </div>
    }>
      <SubastaClient />
    </Suspense>
  );
}
