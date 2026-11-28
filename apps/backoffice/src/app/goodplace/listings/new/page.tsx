import type { Metadata } from 'next';
import { BackToListLink } from '@/components/back-to-list-link';
import { GoodplaceListingForm } from '@/components/goodplace-listing-form';
import { PageHead } from '@/components/page-parts';

export const metadata: Metadata = {
  title: '새 매물 | 굿플레이스',
};

export default function GoodplaceNewListingPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">매물</h1>
      <div className="max-w-4xl">
        <div className="mb-2 md:hidden">
          <BackToListLink href="/goodplace/listings" />
        </div>
        <PageHead title="새 매물" />
        <GoodplaceListingForm />
      </div>
    </div>
  );
}
