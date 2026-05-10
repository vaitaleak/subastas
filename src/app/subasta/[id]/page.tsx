import { params } from 'next/server';
import SubastaClient from '@/components/SubastaClient';

export async function generateStaticParams() {
  // Generate pages for all 350 demo auctions
  return Array.from({ length: 350 }, (_, i) => ({ id: String(i + 1) }));
}

export default function SubastaPage({ params }: { params: { id: string } }) {
  return <SubastaClient id={params.id} />;
}
