import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { ChoidolsangReservationDetail } from '@/components/choidolsang-reservation-detail';
import { PageTitleBar } from '@/components/page-title-bar';

type ReservationDetailPageProps = {
  params: Promise<{ code: string }>;
};

function parseCode(rawCode: string): string | null {
  const code = rawCode.toUpperCase();

  return /^[0-9A-Z]{1,16}$/.test(code) ? code : null;
}

export async function generateMetadata({ params }: ReservationDetailPageProps): Promise<Metadata> {
  const { code } = await params;

  return { title: `예약 ${parseCode(code) ?? ''} | 초이돌상` };
}

export default async function ChoidolsangReservationDetailPage({
  params,
}: ReservationDetailPageProps) {
  const code = parseCode((await params).code);

  if (!code) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">예약</h1>
      {/* 목록으로 링크가 검색 조건을 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <div className="flex max-w-3xl flex-col gap-4">
          <PageTitleBar
            actions={<BackToListLink href="/choidolsang/reservations" />}
            title="예약 상세"
          />
          <ChoidolsangReservationDetail code={code} />
        </div>
      </Suspense>
    </div>
  );
}
