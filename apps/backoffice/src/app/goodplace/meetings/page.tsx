import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GoodplaceMeetingTable } from '@/components/goodplace-meeting-pages';

export const metadata: Metadata = {
  title: '미팅 | 굿플레이스',
};

export default function GoodplaceMeetingsPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">미팅</h1>
      <Suspense>
        <GoodplaceMeetingTable />
      </Suspense>
    </div>
  );
}
