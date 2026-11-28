import type { Metadata } from 'next';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruCustomerForm } from '@/components/kkiru-customer-form';
import { KkiruPageHead } from '@/components/kkiru-parts';

export const metadata: Metadata = {
  title: '새 고객 | 끼루',
};

export default function KkiruNewCustomerPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">고객</h1>
      <div className="max-w-4xl">
        <div className="mb-2 md:hidden">
          <BackToListLink href="/kkiru/customers" />
        </div>
        <KkiruPageHead title="새 고객" />
        <KkiruCustomerForm />
      </div>
    </div>
  );
}
