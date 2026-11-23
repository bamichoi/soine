import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '마케팅 | 초이돌상',
};

export default function ChoidolsangMarketingPage() {
  // 화면 제목은 상단 현재 위치에 표시되므로, 제목은 보조기기용으로만 둔다.
  return <h1 className="sr-only">마케팅</h1>;
}
