import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { GoodplaceNewMeeting } from '@/components/goodplace-meeting-pages';
import { PageHead } from '@/components/page-parts';

export const metadata: Metadata = {
  title: '새 미팅 | 굿플레이스',
};

export default function GoodplaceNewMeetingPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">미팅</h1>
      <Suspense>
        <div className="max-w-4xl">
          <div className="mb-2 md:hidden">
            <BackToListLink href="/goodplace/meetings" />
          </div>
          <PageHead title="새 미팅" />
          <GoodplaceNewMeeting />
        </div>
      </Suspense>
    </div>
  );
}
