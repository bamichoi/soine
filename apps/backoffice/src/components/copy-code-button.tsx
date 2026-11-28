'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { FOCUS_CLASS_NAME } from '@/lib/ui';

type CopyCodeButtonProps = {
  code: string;
  /** 보조기기에 읽히는 이름 (예: "케이스 번호") */
  label: string;
};

// 고유 번호 옆에 두는 복사 버튼. 누르면 번호를 클립보드에 넣고 잠깐 체크 표시를 보여 준다.
export function CopyCodeButton({ code, label }: CopyCodeButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    // 행 전체가 링크인 표 안에서도 상세로 넘어가지 않게 한다.
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(code);
      setState('copied');
    } catch {
      setState('failed');
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => setState('idle'), 1500);
  }

  return (
    <button
      aria-label={state === 'copied' ? `${label} 복사됨` : `${label} ${code} 복사`}
      className={`relative z-10 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition hover:bg-[var(--background)] ${FOCUS_CLASS_NAME} ${
        state === 'copied'
          ? 'text-[var(--success)]'
          : 'text-[var(--muted)] hover:text-[var(--foreground)]'
      }`}
      onClick={handleCopy}
      title={state === 'failed' ? '복사하지 못했습니다' : `${label} 복사`}
      type="button"
    >
      <Icon className="size-3.5" name={state === 'copied' ? 'check' : 'copy'} />
    </button>
  );
}
