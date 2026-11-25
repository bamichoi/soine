import type { Metadata } from 'next';
import { Suspense } from 'react';
import { KkiruListingTable } from '@/components/kkiru-listing-table';

export const metadata: Metadata = {
  title: '매물 | 끼루',
};

export default function KkiruListingsPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">매물</h1>
      <Suspense>
        <KkiruListingTable />
      </Suspense>
    </div>
  );
}
