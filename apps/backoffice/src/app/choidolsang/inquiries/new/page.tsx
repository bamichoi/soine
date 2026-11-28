import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { ChoidolsangInquiryForm } from '@/components/choidolsang-inquiry-form';
import { PageHead } from '@/components/page-parts';

export const metadata: Metadata = {
  title: '문의 추가 | 초이돌상',
};

export default function ChoidolsangNewInquiryPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">문의</h1>
      {/* 목록에서 넘어온 검색·정렬 조건을 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <div className="max-w-4xl">
          <div className="mb-2 md:hidden">
            <BackToListLink href="/choidolsang/inquiries" />
          </div>
          <PageHead title="문의 추가" />
          <ChoidolsangInquiryForm />
        </div>
      </Suspense>
    </div>
  );
}
