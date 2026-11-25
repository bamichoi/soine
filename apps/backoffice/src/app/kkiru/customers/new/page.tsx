import type { Metadata } from 'next';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruCustomerForm } from '@/components/kkiru-customer-form';
import { PageTitleBar } from '@/components/page-title-bar';

export const metadata: Metadata = {
  title: '고객 추가 | 끼루',
};

export default function KkiruNewCustomerPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">고객</h1>
      <div className="flex max-w-3xl flex-col gap-4">
        <PageTitleBar actions={<BackToListLink href="/kkiru/customers" />} title="고객 추가" />
        <KkiruCustomerForm />
      </div>
    </div>
  );
}
