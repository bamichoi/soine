import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruNewContract } from '@/components/kkiru-contract-pages';
import { PageTitleBar } from '@/components/page-title-bar';

export const metadata: Metadata = {
  title: '계약 진행 | 끼루',
};

export default function KkiruNewContractPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">계약</h1>
      <Suspense>
        <div className="flex max-w-3xl flex-col gap-4">
          <PageTitleBar
            actions={<BackToListLink href="/kkiru/contracts" keepQuery={false} />}
            title="계약 진행"
          />
          <KkiruNewContract />
        </div>
      </Suspense>
    </div>
  );
}
