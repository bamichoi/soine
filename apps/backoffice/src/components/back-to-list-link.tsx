'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/icon';

type BackToListLinkProps = {
  href: string;
  /** false면 지금 주소의 값을 목록 주소에 붙이지 않는다 (목록 조건이 아닌 값을 쓰는 화면) */
  keepQuery?: boolean;
};

// 목록에서 넘어올 때 붙여 온 검색·정렬 조건을 그대로 목록 주소에 돌려준다.
// 모바일 전용: 넓은 화면은 사이드 메뉴로 목록에 돌아간다.
export function BackToListLink({ href, keepQuery = true }: BackToListLinkProps) {
  const searchParams = useSearchParams();
  const query = keepQuery ? searchParams.toString() : '';

  return (
    <Link
      className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] md:hidden"
      href={query ? `${href}?${query}` : href}
    >
      <Icon className="size-4" name="arrow-left" />
      목록으로
    </Link>
  );
}
