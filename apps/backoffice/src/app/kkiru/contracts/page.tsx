import type { Metadata } from 'next';
import { Suspense } from 'react';
import { KkiruContractTable } from '@/components/kkiru-contract-pages';

export const metadata: Metadata = {
  title: '계약 | 끼루',
};

export default function KkiruContractsPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">계약</h1>
      <Suspense>
        <KkiruContractTable />
      </Suspense>
    </div>
  );
}
