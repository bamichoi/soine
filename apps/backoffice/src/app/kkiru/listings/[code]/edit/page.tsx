import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { KkiruListingEdit } from '@/components/kkiru-listing-detail';
import { KkiruPageHead } from '@/components/kkiru-parts';
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
      <div className="max-w-4xl">
        <KkiruPageHead title="매물 수정" />
        <KkiruListingEdit code={code} />
      </div>
    </div>
  );
}
