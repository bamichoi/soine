import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GoodplaceCustomerTable } from '@/components/goodplace-customer-table';

export const metadata: Metadata = {
  title: '고객 | 굿플레이스',
};

export default function GoodplaceCustomersPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">고객</h1>
      <Suspense>
        <GoodplaceCustomerTable />
      </Suspense>
    </div>
  );
}
