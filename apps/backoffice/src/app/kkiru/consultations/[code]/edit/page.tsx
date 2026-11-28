import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruConsultationEdit } from '@/components/kkiru-consultation-pages';
import { PageTitleBar } from '@/components/page-title-bar';
import { parseRouteCode } from '@/lib/kkiru-route';

export const metadata: Metadata = {
  title: '상담 수정 | 끼루',
};

export default async function KkiruConsultationEditPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const value = parseRouteCode((await params).code);

  if (!value) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">상담</h1>
      <Suspense>
        <div className="flex max-w-3xl flex-col gap-4">
          <PageTitleBar
            actions={<BackToListLink href="/kkiru/consultations" />}
            title="상담 수정"
          />
          <KkiruConsultationEdit code={value} />
        </div>
      </Suspense>
    </div>
  );
}
