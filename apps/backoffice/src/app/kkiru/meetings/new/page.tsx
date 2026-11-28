import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { KkiruNewMeeting } from '@/components/kkiru-meeting-pages';
import { PageTitleBar } from '@/components/page-title-bar';

export const metadata: Metadata = {
  title: '새 미팅 | 끼루',
};

export default function KkiruNewMeetingPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">미팅</h1>
      <Suspense>
        <div className="flex max-w-3xl flex-col gap-4">
          <PageTitleBar actions={<BackToListLink href="/kkiru/meetings" />} title="새 미팅" />
          <KkiruNewMeeting />
        </div>
      </Suspense>
    </div>
  );
}
