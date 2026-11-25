'use client';

import { toManwonText } from '@/lib/kkiru-format';

type ManwonInputProps = {
  id: string;
  value: string;
  onChange: (text: string) => void;
  required?: boolean;
};

// 만원 단위 금액 입력칸. 숫자만 받고 쉼표를 붙인다.
export function ManwonInput({ id, value, onChange, required = false }: ManwonInputProps) {
  return (
    <div className="relative sm:w-56">
      <input
        className="h-10 w-full border border-[var(--line)] bg-[var(--surface)] px-3 pr-12 text-right text-sm tabular-nums outline-none focus:border-[var(--brand)] disabled:opacity-60"
        id={id}
        inputMode="numeric"
        onChange={(event) => onChange(toManwonText(event.target.value))}
        placeholder="0"
        required={required}
        value={value}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[var(--muted)]">
        만원
      </span>
    </div>
  );
}
