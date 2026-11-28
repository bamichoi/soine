import type { Metadata } from 'next';
import { BackToListLink } from '@/components/back-to-list-link';
import { GoodplaceCustomerForm } from '@/components/goodplace-customer-form';
import { PageHead } from '@/components/page-parts';

export const metadata: Metadata = {
  title: '새 고객 | 굿플레이스',
};

export default function GoodplaceNewCustomerPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">고객</h1>
      <div className="max-w-4xl">
        <div className="mb-2 md:hidden">
          <BackToListLink href="/goodplace/customers" />
        </div>
        <PageHead title="새 고객" />
        <GoodplaceCustomerForm />
      </div>
    </div>
  );
}
