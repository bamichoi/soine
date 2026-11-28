import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GoodplaceListingEdit } from '@/components/goodplace-listing-detail';
import { PageHead } from '@/components/page-parts';
import { parseRouteCode } from '@/lib/goodplace-route';

export const metadata: Metadata = {
  title: '매물 수정 | 굿플레이스',
};

export default async function GoodplaceListingEditPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const code = parseRouteCode((await params).code);

  if (!code) {
    notFound();
  }

  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">매물</h1>
      <div className="max-w-4xl">
        <PageHead title="매물 수정" />
        <GoodplaceListingEdit code={code} />
      </div>
    </div>
  );
}
