import type { Metadata } from 'next';
import { Suspense } from 'react';
import { KkiruConsultationTable } from '@/components/kkiru-consultation-pages';

export const metadata: Metadata = {
  title: '상담 | 끼루',
};

export default function KkiruConsultationsPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">상담</h1>
      <Suspense>
        <KkiruConsultationTable />
      </Suspense>
    </div>
  );
}
