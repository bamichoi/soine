import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GoodplaceListingTable } from '@/components/goodplace-listing-table';

export const metadata: Metadata = {
  title: '매물 | 굿플레이스',
};

export default function GoodplaceListingsPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">매물</h1>
      <Suspense>
        <GoodplaceListingTable />
      </Suspense>
    </div>
  );
}
