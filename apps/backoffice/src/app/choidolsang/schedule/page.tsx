import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MonthCalendar } from '@/components/month-calendar';

export const metadata: Metadata = {
  title: '일정 | 초이돌상',
};

export default function ChoidolsangSchedulePage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">일정</h1>
      {/* 보고 있는 달을 주소에서 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <MonthCalendar />
      </Suspense>
    </div>
  );
}
