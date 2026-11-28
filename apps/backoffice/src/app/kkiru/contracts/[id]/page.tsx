import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruContractDetailView } from '@/components/kkiru-contract-detail';
import { PageTitleBar } from '@/components/page-title-bar';
import { parseRouteId } from '@/lib/kkiru-route';

export const metadata: Metadata = {
  title: '계약 상세 | 끼루',
};

export default async function KkiruContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const value = parseRouteId((await params).id);

  if (!value) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">계약</h1>
      <Suspense>
        <div className="flex max-w-3xl flex-col gap-4">
          <PageTitleBar actions={<BackToListLink href="/kkiru/contracts" />} title="계약 상세" />
          <KkiruContractDetailView id={value} />
        </div>
      </Suspense>
    </div>
  );
}
