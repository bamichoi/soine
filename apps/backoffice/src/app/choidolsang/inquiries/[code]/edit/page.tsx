import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { ChoidolsangInquiryEditForm } from '@/components/choidolsang-inquiry-form';
import { PageTitleBar } from '@/components/page-title-bar';

type InquiryEditPageProps = {
  params: Promise<{ code: string }>;
};

function parseCode(rawCode: string): string | null {
  const code = rawCode.toUpperCase();

  return /^[0-9A-Z]{1,16}$/.test(code) ? code : null;
}

export async function generateMetadata({ params }: InquiryEditPageProps): Promise<Metadata> {
  const { code } = await params;

  return { title: `문의 ${parseCode(code) ?? ''} 수정 | 초이돌상` };
}

export default async function ChoidolsangInquiryEditPage({ params }: InquiryEditPageProps) {
  const code = parseCode((await params).code);

  if (!code) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="sr-only">문의</h1>
      {/* 목록에서 넘어온 검색·정렬 조건을 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <div className="flex max-w-3xl flex-col gap-4">
          <PageTitleBar
            actions={<BackToListLink href="/choidolsang/inquiries" />}
            title="문의 수정"
          />
          <ChoidolsangInquiryEditForm code={code} />
        </div>
      </Suspense>
    </div>
  );
}
