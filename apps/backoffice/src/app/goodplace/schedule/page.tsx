import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GoodplaceScheduleCalendar } from '@/components/goodplace-schedule-calendar';

export const metadata: Metadata = {
  title: '일정 | 굿플레이스',
};

export default function GoodplaceSchedulePage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      {/* 화면 제목은 상단 현재 위치에 표시되므로, 제목은 보조기기용으로만 둔다. */}
      <h1 className="sr-only">일정</h1>
      {/* 보고 있는 달을 주소에서 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <GoodplaceScheduleCalendar />
      </Suspense>
    </div>
  );
}
