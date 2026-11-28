import type { Metadata } from 'next';
import { KkiruNotice, KkiruPageHead } from '@/components/kkiru-parts';

export const metadata: Metadata = {
  title: '광고 | 끼루',
};

export default function KkiruAdsPage() {
  return (
    <div className="p-4 md:p-8">
      {/* 화면 제목은 상단 현재 위치에 표시되므로, 제목은 보조기기용으로만 둔다. */}
      <h1 className="sr-only">광고</h1>
      <KkiruPageHead title="광고" />
      <KkiruNotice text="광고 화면은 준비 중입니다." />
    </div>
  );
}
