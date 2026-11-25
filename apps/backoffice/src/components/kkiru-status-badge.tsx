import { STATUS_TONE_CLASS_NAMES, statusTone } from '@/lib/kkiru-status';

// 끼루 상태 배지. 글자(label)와 색을 함께 보여 준다.
export function KkiruStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs whitespace-nowrap ${STATUS_TONE_CLASS_NAMES[statusTone(status)]}`}
    >
      {label}
    </span>
  );
}
