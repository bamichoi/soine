import type { ReactNode } from 'react';

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  /** 'kkiru'면 끼루 폼 모양(굵은 라벨, 좁은 라벨 칸). 기본은 지금 모양 그대로 */
  look?: 'default' | 'kkiru';
};

const LOOKS = {
  default: {
    grid: 'grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-4',
    label: 'pt-2 text-sm font-medium',
  },
  kkiru: {
    grid: 'grid gap-2 sm:grid-cols-[9rem_1fr] sm:gap-4',
    label: 'pt-3 text-sm font-semibold',
  },
};

// 폼 한 줄: 넓은 화면에서는 왼쪽에 이름, 오른쪽에 입력칸을 둔다.
export function FormField({
  label,
  htmlFor,
  required = false,
  hint,
  children,
  look = 'default',
}: FormFieldProps) {
  return (
    <div className={LOOKS[look].grid}>
      <label className={LOOKS[look].label} htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-[var(--error)]">
            *
          </span>
        ) : null}
      </label>
      <div className="flex min-w-0 flex-col gap-1.5">
        {children}
        {hint ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}
