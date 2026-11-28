import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GoodplaceIncomeView } from '@/components/goodplace-income';

export const metadata: Metadata = {
  title: '수입 | 굿플레이스',
};

export default function GoodplaceIncomePage() {
  return (
    <div className="p-4 md:px-8 md:pt-2 md:pb-8">
      {/* 화면 제목은 상단 현재 위치에 표시되므로, 제목은 보조기기용으로만 둔다. */}
      <h1 className="sr-only">수입</h1>
      {/* 기간·거르기를 주소에서 읽으므로 Suspense가 필요하다. */}
      <Suspense>
        <GoodplaceIncomeView />
      </Suspense>
    </div>
  );
}
