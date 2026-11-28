import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChoidolsangReservationTable } from '@/components/choidolsang-reservation-table';

export const metadata: Metadata = {
  title: '예약 | 초이돌상',
};

export default function ChoidolsangReservationsPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">예약</h1>
      {/* 페이지 번호를 주소에서 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <ChoidolsangReservationTable />
      </Suspense>
    </div>
  );
}
