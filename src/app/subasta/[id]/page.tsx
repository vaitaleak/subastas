import SubastaClient from '@/components/SubastaClient';

export async function generateStaticParams() {
  return Array.from({ length: 350 }, (_, i) => ({ id: String(i + 1) }));
}

export default async function SubastaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubastaClient id={id} />;
}
