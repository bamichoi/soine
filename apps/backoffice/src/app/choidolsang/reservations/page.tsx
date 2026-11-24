import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChoidolsangReservationTable } from '@/components/choidolsang-reservation-table';

export const metadata: Metadata = {
  title: '예약 | 초이돌상',
};

export default function ChoidolsangReservationsPage() {
  return (
    <div className="p-4 md:p-8">
      {/* 화면 제목은 상단 현재 위치에 표시되므로, 제목은 보조기기용으로만 둔다. */}
      <h1 className="sr-only">예약</h1>
      {/* 페이지 번호를 주소에서 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <ChoidolsangReservationTable />
      </Suspense>
    </div>
  );
}
