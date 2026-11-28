import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GoodplaceContractTable } from '@/components/goodplace-contract-pages';

export const metadata: Metadata = {
  title: '계약 | 굿플레이스',
};

export default function GoodplaceContractsPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">계약</h1>
      <Suspense>
        <GoodplaceContractTable />
      </Suspense>
    </div>
  );
}
