'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import {
  type ConceptOption,
  formatPrice,
  listConceptOptions,
} from '@/lib/choidolsang-concepts-api';
import type { InquiryConceptRef } from '@/lib/choidolsang-inquiries-api';

type ConceptSelectProps = {
  id: string;
  /** 선택한 컨셉 ID. 빈 문자열이면 선택 안 함 */
  value: string;
  onChange: (conceptId: string) => void;
  /** 수정할 때 원래 고른 컨셉. 그사이 삭제됐어도 목록에 남겨 그대로 둘 수 있게 한다. */
  current: InquiryConceptRef | null;
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; options: ConceptOption[] };

// 돌상 컨셉 메뉴에 등록한 컨셉 중에서 고른다.
export function ConceptSelect({ id, value, onChange, current }: ConceptSelectProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;

    listConceptOptions()
      .then((options) => {
        if (isActive) {
          setState({ kind: 'loaded', options });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ kind: 'error' });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const options = state.kind === 'loaded' ? state.options : [];
  const isCurrentMissing = current !== null && !options.some((option) => option.id === current.id);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <select
          className="h-10 w-full appearance-none border border-[var(--line)] bg-[var(--surface)] px-3 pr-9 text-sm outline-none focus:border-[var(--brand)] disabled:opacity-60"
          disabled={state.kind !== 'loaded'}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          <option value="">{state.kind === 'loading' ? '불러오는 중...' : '선택 안 함'}</option>
          {isCurrentMissing ? (
            <option value={current.id}>
              {current.name}
              {current.isDeleted ? ' (삭제됨)' : ''}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} · {formatPrice(option.price)}
            </option>
          ))}
        </select>
        <Icon
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--muted)]"
          name="chevron-down"
        />
      </div>
      {state.kind === 'error' ? (
        <p className="text-xs text-[var(--error)]" role="alert">
          돌상 컨셉 목록을 불러오지 못했습니다. 새로고침해 주세요.
        </p>
      ) : null}
      {state.kind === 'loaded' && options.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">
          등록된 돌상 컨셉이 없습니다.{' '}
          <Link className="underline underline-offset-2" href="/choidolsang/concepts/new">
            돌상 컨셉 추가
          </Link>
        </p>
      ) : null}
    </div>
  );
}
