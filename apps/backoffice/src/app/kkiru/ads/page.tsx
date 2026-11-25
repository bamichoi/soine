import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '광고 | 끼루',
};

export default function KkiruAdsPage() {
  // 화면 제목은 상단 현재 위치에 표시되므로, 제목은 보조기기용으로만 둔다.
  return <h1 className="sr-only">광고</h1>;
}
