import Link from 'next/link';
import type { ReactNode } from 'react';
import { CopyCodeButton } from '@/components/copy-code-button';
import { KkiruHeadMeta, KkiruPageHead } from '@/components/kkiru-parts';
import { KkiruStatusBadge } from '@/components/kkiru-status-badge';
import { CARD_CLASS_NAME, FAINT_CLASS_NAME, FOCUS_CLASS_NAME } from '@/lib/kkiru-ui';

// 끼루 상세 화면 공통 조각 (docs/design/kkiru-style-guide.md '상세 화면', 시안 kkiru-style-meeting-detail.html).
// 순서: 제목 줄 → 정보 시트 → 진행 목록 → 기록. 큰 숫자·알약은 쓰지 않는다.

// ---------------------------------------------------------------- 제목 줄

type DetailHeadProps = {
  /** 번호 앞 말 (예: "케이스", "매물") */
  codeLabel: string;
  code: string;
  /** 복사 버튼 보조기기 이름 (예: "케이스 번호") */
  copyLabel: string;
  status?: { value: string; label: string };
  /** 그 건의 제목 (미팅 제목·매물 이름·고객 이름) */
  title: string;
  /** 오른쪽 동작 버튼. 보조 → 위험 → 주 순서 */
  actions?: ReactNode;
};

/** 상세 제목 줄. 왼쪽 위 `케이스 CODE [복사] [상태]`, 아래 제목, 오른쪽 동작 버튼 */
export function KkiruDetailHead({
  codeLabel,
  code,
  copyLabel,
  status,
  title,
  actions,
}: DetailHeadProps) {
  return (
    <KkiruPageHead
      controlsClassName="flex w-full flex-wrap items-center gap-2 sm:w-auto"
      meta={
        <KkiruHeadMeta>
          {codeLabel}
          <span className="font-mono text-[13px] text-[var(--foreground)]" translate="no">
            {code}
          </span>
          <CopyCodeButton code={code} label={copyLabel} />
          {status ? <KkiruStatusBadge label={status.label} status={status.value} /> : null}
        </KkiruHeadMeta>
      }
      title={title}
    >
      {actions}
    </KkiruPageHead>
  );
}

// ---------------------------------------------------------------- 정보 시트

/** 정보 시트 카드. 안을 InfoGroup으로 나눈다. */
export function InfoSheet({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className={`px-5 py-1 md:px-7 ${CARD_CLASS_NAME}`}>
      {children}
    </section>
  );
}

const GROUP_CLASS_NAME =
  'grid gap-3 border-t border-[var(--line)]/60 py-[18px] first:border-t-0 md:grid-cols-[88px_minmax(0,1fr)] md:gap-6';

/** 묶음: 왼쪽 묶음 제목, 오른쪽 4열(모바일 2열) 정의 목록 */
export function InfoGroup({
  title,
  titleClassName = '',
  children,
}: {
  title: string;
  /** 묶음 제목 색을 바꿀 때 (예: 취소 사유) */
  titleClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={GROUP_CLASS_NAME}>
      <h3 className={`text-sm font-bold md:pt-px ${titleClassName}`}>{title}</h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 md:grid-cols-4">{children}</dl>
    </div>
  );
}

/** 긴 글 묶음 (특약 사항, 특징, 메모). 빈 값이면 '없음' */
export function InfoTextGroup({
  title,
  titleClassName = '',
  text,
}: {
  title: string;
  titleClassName?: string;
  text: string | null;
}) {
  return (
    <div className={GROUP_CLASS_NAME}>
      <h3 className={`text-sm font-bold md:pt-px ${titleClassName}`}>{title}</h3>
      <p className="text-[15px] leading-7 break-words whitespace-pre-wrap">
        {text ?? <span className={FAINT_CLASS_NAME}>없음</span>}
      </p>
    </div>
  );
}

/** 시트 한 칸. 모든 값은 같은 크기(15px). 보조 표기는 sub로 아래 줄에 옅게 */
export function InfoItem({
  label,
  children,
  sub,
  isMoney = false,
  className = '',
}: {
  label: string;
  children: ReactNode;
  sub?: ReactNode;
  /** 금액이면 굵게·고정폭 숫자 */
  isMoney?: boolean;
  /** 칸 배치를 바꿀 때 (예: 두 칸 차지) */
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-[13px] font-semibold text-[var(--muted)]">{label}</dt>
      <dd
        className={`mt-[3px] text-[15px] break-words ${isMoney ? 'font-bold tabular-nums' : 'font-semibold'}`}
      >
        {children}
        {sub ? (
          <small className={`block text-xs font-medium ${FAINT_CLASS_NAME}`}>{sub}</small>
        ) : null}
      </dd>
    </div>
  );
}

/** 시트 값 안의 링크 (고객 이름 등) */
export function InfoLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      className={`rounded-sm text-[var(--brand)] underline-offset-2 hover:underline ${FOCUS_CLASS_NAME}`}
      href={href}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------- 진행 목록

/**
 * 상세 안 하위 목록: 카드 하나 + 열 머리 + 줄. 열 폭은 gridClassName으로 고정한다
 * (예: 'md:grid-cols-[minmax(0,1fr)_84px_104px_136px]'). 모바일은 열 머리를 숨기고 쌓는다.
 */
export function DetailList({
  label,
  columns,
  gridClassName,
  top,
  children,
}: {
  label: string;
  columns: string[];
  gridClassName: string;
  /** 열 머리 위에 여는 줄 (예: 매물 검색) */
  top?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={label} className={`px-2 ${CARD_CLASS_NAME}`}>
      {top}
      <div
        aria-hidden="true"
        className={`hidden h-11 items-center gap-4 border-b border-[var(--line)]/60 px-3.5 text-xs font-semibold text-[var(--muted)] md:grid ${gridClassName}`}
      >
        {columns.map((column, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 열 머리는 순서가 고정이고 빈 이름도 있다.
          <span key={index}>{column}</span>
        ))}
      </div>
      {children}
    </section>
  );
}

/** 진행 목록 한 줄. 줄 전체가 링크이고, 줄 안 버튼은 relative z-10으로 링크 위에 둔다. */
export function DetailListRow({
  href,
  linkLabel,
  gridClassName,
  children,
}: {
  href: string;
  linkLabel: string;
  gridClassName: string;
  children: ReactNode;
}) {
  return (
    <li
      className={`relative flex min-h-[68px] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border-b border-[var(--line)]/40 px-3.5 py-3 last:border-b-0 hover:bg-[var(--background)]/60 md:grid md:gap-4 ${gridClassName}`}
    >
      <Link
        aria-label={linkLabel}
        className="absolute inset-0 rounded-xl outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand)]"
        href={href}
      />
      {children}
    </li>
  );
}

/** 줄의 첫 칸: 이름 + 옅은 번호, 아래 설명 한 줄. 모바일은 한 줄 전체를 쓴다. */
export function DetailListTitle({
  name,
  code,
  description,
}: {
  name: string;
  code?: string;
  description?: ReactNode;
}) {
  return (
    <div className="w-full min-w-0 md:w-auto">
      <p className="flex min-w-0 items-baseline gap-2 text-[15px] font-bold">
        <span className="truncate">{name}</span>
        {code ? (
          <span
            className={`shrink-0 font-mono text-xs font-medium ${FAINT_CLASS_NAME}`}
            translate="no"
          >
            {code}
          </span>
        ) : null}
      </p>
      {description ? (
        <p className="mt-0.5 truncate text-[13px] text-[var(--muted)] tabular-nums">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** 배지 칸. 모바일은 열 머리가 없으므로 앞에 짧은 이름을 붙인다. 값이 없으면 옅은 '-' */
export function DetailListBadge({
  mobileLabel,
  status,
  emptyLabel,
}: {
  mobileLabel: string;
  status: { value: string; label: string } | null;
  /** 값이 없을 때 보조기기에 읽히는 말 (예: "계약 없음") */
  emptyLabel?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-[var(--muted)] md:hidden">{mobileLabel}</span>
      {status ? (
        <KkiruStatusBadge label={status.label} status={status.value} />
      ) : (
        <span className={FAINT_CLASS_NAME}>
          <span aria-hidden="true">-</span>
          {emptyLabel ? <span className="sr-only">{emptyLabel}</span> : null}
        </span>
      )}
    </span>
  );
}

/** 진행 목록 카드 안 빈 문구 */
export function DetailListEmpty({ text }: { text: string }) {
  return <p className="px-3.5 py-10 text-center text-sm text-[var(--muted)]">{text}</p>;
}
