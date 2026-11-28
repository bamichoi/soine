import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { GoodplaceMeetingDetailView } from '@/components/goodplace-meeting-detail';
import { parseRouteCode } from '@/lib/goodplace-route';

export const metadata: Metadata = {
  title: '미팅 상세 | 굿플레이스',
};

export default async function GoodplaceMeetingDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const value = parseRouteCode((await params).code);

  if (!value) {
    notFound();
  }

  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">미팅</h1>
      <Suspense>
        <div className="max-w-4xl">
          <div className="mb-2 md:hidden">
            <BackToListLink href="/goodplace/meetings" />
          </div>
          <GoodplaceMeetingDetailView code={value} />
        </div>
      </Suspense>
    </div>
  );
}
