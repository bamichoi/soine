'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import {
  type ConceptOption,
  formatPrice,
  listConceptOptions,
} from '@/lib/choidolsang-concepts-api';
import type { InquiryConceptRef } from '@/lib/choidolsang-inquiries-api';
import { FOCUS_CLASS_NAME, INPUT_CLASS_NAME } from '@/lib/ui';

type ConceptSelectProps = {
  id: string;
  /** 선택한 컨셉 ID. 빈 문자열이면 선택 안 함 */
  value: string;
  /** 고른 컨셉 ID와 그 항목(가격 등). 선택 안 함이면 option은 undefined */
  onChange: (conceptId: string, option?: ConceptOption) => void;
  /** 목록을 불러오면 한 번 알려 준다. 기본값(가격 등)을 채울 때 쓴다. */
  onOptionsLoaded?: (options: ConceptOption[]) => void;
  /** 비어 있을 때 보여 줄 글 (기본: 선택 안 함) */
  emptyLabel?: string;
  /** 수정할 때 원래 고른 컨셉. 그사이 삭제됐어도 목록에 남겨 그대로 둘 수 있게 한다. */
  current: InquiryConceptRef | null;
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; options: ConceptOption[] };

// 돌상 컨셉 메뉴에 등록한 컨셉 중에서 고른다.
export function ConceptSelect({
  id,
  value,
  onChange,
  onOptionsLoaded,
  emptyLabel = '선택 안 함',
  current,
}: ConceptSelectProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  // 목록은 처음 한 번만 불러온다. 부모가 넘긴 콜백이 바뀌어도 다시 부르지 않도록 ref로 둔다.
  const onOptionsLoadedRef = useRef(onOptionsLoaded);
  onOptionsLoadedRef.current = onOptionsLoaded;

  useEffect(() => {
    let isActive = true;

    listConceptOptions()
      .then((options) => {
        if (isActive) {
          setState({ kind: 'loaded', options });
          onOptionsLoadedRef.current?.(options);
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
          className={`${INPUT_CLASS_NAME} cursor-pointer appearance-none pr-9 disabled:cursor-default`}
          disabled={state.kind !== 'loaded'}
          id={id}
          onChange={(event) =>
            onChange(
              event.target.value,
              options.find((option) => option.id === event.target.value),
            )
          }
          value={value}
        >
          <option value="">{state.kind === 'loading' ? '불러오는 중...' : emptyLabel}</option>
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
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-[var(--muted)]"
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
          <Link
            className={`rounded-sm underline underline-offset-2 hover:text-[var(--brand)] ${FOCUS_CLASS_NAME}`}
            href="/choidolsang/concepts/new"
          >
            돌상 컨셉 추가
          </Link>
        </p>
      ) : null}
    </div>
  );
}
