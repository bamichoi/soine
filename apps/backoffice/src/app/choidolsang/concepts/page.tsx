import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChoidolsangConceptTable } from '@/components/choidolsang-concept-table';

export const metadata: Metadata = {
  title: '돌상 컨셉 | 초이돌상',
};

export default function ChoidolsangConceptsPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">돌상 컨셉</h1>
      {/* 검색·페이지 조건을 URL에서 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <ChoidolsangConceptTable />
      </Suspense>
    </div>
  );
}
