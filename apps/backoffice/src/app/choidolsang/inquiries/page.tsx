import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChoidolsangInquiryTable } from '@/components/choidolsang-inquiry-table';

export const metadata: Metadata = {
  title: '문의 | 초이돌상',
};

export default function ChoidolsangInquiriesPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">문의</h1>
      {/* 목록 조건을 URL 검색 파라미터에서 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <ChoidolsangInquiryTable />
      </Suspense>
    </div>
  );
}
