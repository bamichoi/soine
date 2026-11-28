import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { ChoidolsangConceptDetail } from '@/components/choidolsang-concept-detail';
import { parseConceptId } from '@/lib/choidolsang-concepts-api';

export const metadata: Metadata = {
  title: '돌상 컨셉 상세 | 초이돌상',
};

type ConceptDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChoidolsangConceptDetailPage({ params }: ConceptDetailPageProps) {
  const id = parseConceptId((await params).id);

  if (!id) {
    notFound();
  }

  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">돌상 컨셉</h1>
      {/* 목록에서 넘어온 검색·페이지 조건을 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <div className="max-w-4xl">
          <div className="mb-2 md:hidden">
            <BackToListLink href="/choidolsang/concepts" />
          </div>
          <ChoidolsangConceptDetail id={id} />
        </div>
      </Suspense>
    </div>
  );
}
