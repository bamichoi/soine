import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BackToListLink } from '@/components/back-to-list-link';
import { ChoidolsangInquiryDetail } from '@/components/choidolsang-inquiry-detail';

type InquiryDetailPageProps = {
  params: Promise<{ code: string }>;
};

function parseCode(rawCode: string): string | null {
  const code = rawCode.toUpperCase();

  return /^[0-9A-Z]{1,16}$/.test(code) ? code : null;
}

export async function generateMetadata({ params }: InquiryDetailPageProps): Promise<Metadata> {
  const { code } = await params;

  return { title: `문의 ${parseCode(code) ?? ''} | 초이돌상` };
}

export default async function ChoidolsangInquiryDetailPage({ params }: InquiryDetailPageProps) {
  const code = parseCode((await params).code);

  if (!code) {
    notFound();
  }

  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">문의</h1>
      {/* 목록에서 넘어온 검색·정렬 조건을 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <div className="max-w-4xl">
          <div className="mb-2 md:hidden">
            <BackToListLink href="/choidolsang/inquiries" />
          </div>
          <ChoidolsangInquiryDetail code={code} />
        </div>
      </Suspense>
    </div>
  );
}
