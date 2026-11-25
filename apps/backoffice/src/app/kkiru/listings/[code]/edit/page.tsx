import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { KkiruListingEdit } from '@/components/kkiru-listing-detail';
import { PageTitleBar } from '@/components/page-title-bar';
import { parseRouteCode } from '@/lib/kkiru-route';

export const metadata: Metadata = {
  title: '매물 수정 | 끼루',
};

export default async function KkiruListingEditPage({
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
      <div className="flex max-w-3xl flex-col gap-4">
        <PageTitleBar title="매물 수정" />
        <KkiruListingEdit code={code} />
      </div>
    </div>
  );
}
