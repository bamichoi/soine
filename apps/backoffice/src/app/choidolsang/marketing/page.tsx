import type { Metadata } from 'next';
import { Notice, PageHead } from '@/components/page-parts';

export const metadata: Metadata = {
  title: '마케팅 | 초이돌상',
};

export default function ChoidolsangMarketingPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">마케팅</h1>
      <PageHead title="마케팅" />
      <Notice text="마케팅 화면은 준비 중입니다." />
    </div>
  );
}
