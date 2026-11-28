import type { Metadata } from 'next';
import { Suspense } from 'react';
import { KkiruMeetingTable } from '@/components/kkiru-meeting-pages';

export const metadata: Metadata = {
  title: '미팅 | 끼루',
};

export default function KkiruMeetingsPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">미팅</h1>
      <Suspense>
        <KkiruMeetingTable />
      </Suspense>
    </div>
  );
}
