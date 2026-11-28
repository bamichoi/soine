import type { Metadata } from 'next';
import { Notice, PageHead } from '@/components/page-parts';

export const metadata: Metadata = {
  title: '매출 | 초이돌상',
};

export default function ChoidolsangSalesPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">매출</h1>
      <PageHead title="매출" />
      <Notice text="매출 화면은 준비 중입니다." />
    </div>
  );
}
