import type { Metadata } from 'next';
import { Suspense } from 'react';
import { KkiruCustomerTable } from '@/components/kkiru-customer-table';

export const metadata: Metadata = {
  title: '고객 | 끼루',
};

export default function KkiruCustomersPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">고객</h1>
      <Suspense>
        <KkiruCustomerTable />
      </Suspense>
    </div>
  );
}
