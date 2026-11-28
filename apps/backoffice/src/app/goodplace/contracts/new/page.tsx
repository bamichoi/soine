import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { GoodplaceNewContract } from '@/components/goodplace-contract-pages';
import { PageHead } from '@/components/page-parts';

export const metadata: Metadata = {
  title: '계약 진행 | 굿플레이스',
};

export default function GoodplaceNewContractPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">계약</h1>
      <Suspense>
        <div className="max-w-4xl">
          <div className="mb-2 md:hidden">
            <BackToListLink href="/goodplace/contracts" keepQuery={false} />
          </div>
          <PageHead title="계약 진행" />
          <GoodplaceNewContract />
        </div>
      </Suspense>
    </div>
  );
}
