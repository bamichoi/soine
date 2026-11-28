import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruMeetingDetailView } from '@/components/kkiru-meeting-detail';
import { parseRouteCode } from '@/lib/kkiru-route';

export const metadata: Metadata = {
  title: '미팅 상세 | 끼루',
};

export default async function KkiruMeetingDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const value = parseRouteCode((await params).code);

  if (!value) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">미팅</h1>
      <Suspense>
        <div className="max-w-4xl">
          <div className="mb-2 md:hidden">
            <BackToListLink href="/kkiru/meetings" />
          </div>
          <KkiruMeetingDetailView code={value} />
        </div>
      </Suspense>
    </div>
  );
}
