import type { Metadata } from 'next';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruListingForm } from '@/components/kkiru-listing-form';
import { PageTitleBar } from '@/components/page-title-bar';

export const metadata: Metadata = {
  title: '새 매물 | 끼루',
};

export default function KkiruNewListingPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">매물</h1>
      <div className="flex max-w-3xl flex-col gap-4">
        <PageTitleBar actions={<BackToListLink href="/kkiru/listings" />} title="새 매물" />
        <KkiruListingForm />
      </div>
    </div>
  );
}
