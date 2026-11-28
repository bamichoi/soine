import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { ChoidolsangConceptEditForm } from '@/components/choidolsang-concept-form';
import { PageHead } from '@/components/page-parts';
import { parseConceptId } from '@/lib/choidolsang-concepts-api';

export const metadata: Metadata = {
  title: '돌상 컨셉 수정 | 초이돌상',
};

type ConceptEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChoidolsangConceptEditPage({ params }: ConceptEditPageProps) {
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
          <PageHead title="돌상 컨셉 수정" />
          <ChoidolsangConceptEditForm id={id} />
        </div>
      </Suspense>
    </div>
  );
}
