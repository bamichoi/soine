'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { AdminApiError } from '@/lib/admin-auth-api';

type LoadState<T> =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: T };

type KkiruLoaderProps<T> = {
  /** 주소 값(번호·ID). 바뀌면 다시 불러온다. */
  loadKey: string;
  load: (key: string) => Promise<T>;
  /** 화면 문구에 쓰는 이름 (예: "미팅") */
  noun: string;
  children: (data: T, replace: (next: T) => void) => ReactNode;
};

// 상세·수정 화면 공통 불러오기. 불러오는 중·없음·오류 안내를 함께 보여 준다.
export function KkiruLoader<T>({ loadKey, load, noun, children }: KkiruLoaderProps<T>) {
  const [state, setState] = useState<LoadState<T>>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;
    setState({ kind: 'loading' });

    load(loadKey)
      .then((data) => {
        if (isActive) {
          setState({ data, kind: 'loaded' });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setState(
            error instanceof AdminApiError && error.status === 404
              ? { kind: 'not-found' }
              : { kind: 'error' },
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [load, loadKey]);

  const replace = useCallback((next: T) => setState({ data: next, kind: 'loaded' }), []);

  if (state.kind === 'loading') {
    return <p className="py-10 text-sm text-[var(--muted)]">{noun}을(를) 불러오고 있습니다.</p>;
  }

  if (state.kind === 'not-found') {
    return <p className="py-10 text-sm text-[var(--muted)]">해당 {noun}을(를) 찾을 수 없습니다.</p>;
  }

  if (state.kind === 'error') {
    return (
      <p className="py-10 text-sm text-[var(--error)]" role="alert">
        {noun}을(를) 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return <>{children(state.data, replace)}</>;
}
