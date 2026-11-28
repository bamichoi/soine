'use client';

import { toManwonText } from '@/lib/goodplace-format';
import { INPUT_CLASS_NAME, INPUT_UNIT_CLASS_NAME } from '@/lib/ui';

type ManwonInputProps = {
  id: string;
  value: string;
  onChange: (text: string) => void;
  required?: boolean;
};

// 만원 단위 금액 입력칸. 숫자만 받고 쉼표를 붙인다. 회색 둥근 입력칸 모양.
export function ManwonInput({ id, value, onChange, required = false }: ManwonInputProps) {
  return (
    <div className="relative sm:w-56">
      <input
        className={`${INPUT_CLASS_NAME} pr-14 text-right tabular-nums`}
        id={id}
        inputMode="numeric"
        onChange={(event) => onChange(toManwonText(event.target.value))}
        placeholder="0"
        required={required}
        value={value}
      />
      <span className={INPUT_UNIT_CLASS_NAME}>만원</span>
    </div>
  );
}
