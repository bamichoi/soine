import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { GoodplaceContractDetailView } from '@/components/goodplace-contract-detail';
import { parseRouteId } from '@/lib/goodplace-route';

export const metadata: Metadata = {
  title: '계약 상세 | 굿플레이스',
};

export default async function GoodplaceContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const value = parseRouteId((await params).id);

  if (!value) {
    notFound();
  }

  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">계약</h1>
      <Suspense>
        <div className="max-w-4xl">
          <div className="mb-2 md:hidden">
            <BackToListLink href="/goodplace/contracts" />
          </div>
          <GoodplaceContractDetailView id={value} />
        </div>
      </Suspense>
    </div>
  );
}
