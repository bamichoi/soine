import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruListingDetailView } from '@/components/kkiru-listing-detail';
import { parseRouteCode } from '@/lib/kkiru-route';

export const metadata: Metadata = {
  title: '매물 상세 | 끼루',
};

export default async function KkiruListingDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const code = parseRouteCode((await params).code);

  if (!code) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">매물</h1>
      <div className="max-w-4xl">
        <div className="mb-2 md:hidden">
          <BackToListLink href="/kkiru/listings" />
        </div>
        <KkiruListingDetailView code={code} />
      </div>
    </div>
  );
}
