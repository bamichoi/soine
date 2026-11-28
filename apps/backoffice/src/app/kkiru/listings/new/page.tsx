import type { Metadata } from 'next';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruListingForm } from '@/components/kkiru-listing-form';
import { KkiruPageHead } from '@/components/kkiru-parts';

export const metadata: Metadata = {
  title: '새 매물 | 끼루',
};

export default function KkiruNewListingPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">매물</h1>
      <div className="max-w-4xl">
        <div className="mb-2 md:hidden">
          <BackToListLink href="/kkiru/listings" />
        </div>
        <KkiruPageHead title="새 매물" />
        <KkiruListingForm />
      </div>
    </div>
  );
}
