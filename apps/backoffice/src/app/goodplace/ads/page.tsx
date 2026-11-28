import type { Metadata } from 'next';
import { Notice, PageHead } from '@/components/page-parts';

export const metadata: Metadata = {
  title: '광고 | 굿플레이스',
};

export default function GoodplaceAdsPage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      <h1 className="sr-only">광고</h1>
      <PageHead title="광고" />
      <Notice text="광고 화면은 준비 중입니다." />
    </div>
  );
}
