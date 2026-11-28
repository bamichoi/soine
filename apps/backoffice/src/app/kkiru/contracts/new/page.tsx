import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruNewContract } from '@/components/kkiru-contract-pages';
import { KkiruPageHead } from '@/components/kkiru-parts';

export const metadata: Metadata = {
  title: '계약 진행 | 끼루',
};

export default function KkiruNewContractPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">계약</h1>
      <Suspense>
        <div className="max-w-4xl">
          <div className="mb-2 md:hidden">
            <BackToListLink href="/kkiru/contracts" keepQuery={false} />
          </div>
          <KkiruPageHead title="계약 진행" />
          <KkiruNewContract />
        </div>
      </Suspense>
    </div>
  );
}
