import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruNewConsultation } from '@/components/kkiru-consultation-pages';
import { PageTitleBar } from '@/components/page-title-bar';

export const metadata: Metadata = {
  title: '새 상담 | 끼루',
};

export default function KkiruNewConsultationPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">상담</h1>
      <Suspense>
        <div className="flex max-w-3xl flex-col gap-4">
          <PageTitleBar actions={<BackToListLink href="/kkiru/consultations" />} title="새 상담" />
          <KkiruNewConsultation />
        </div>
      </Suspense>
    </div>
  );
}
