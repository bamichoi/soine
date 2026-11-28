import { STATUS_TONE_CLASS_NAMES, statusTone } from '@/lib/kkiru-status';

// 끼루 상태 배지(현재 끼루 전용). 글자(label)와 색을 함께 보여 준다.
// 누를 수 없으므로 버튼과 모양으로 구분한다: 22px 납작한 사각, 앞에 점, 테두리·그림자·호버 없음
// (docs/design/kkiru-style-guide.md '배지·칩·버튼 구분 원칙').
export function KkiruStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex h-[22px] cursor-default items-center gap-1 rounded-md px-1.5 text-xs font-semibold whitespace-nowrap select-none ${STATUS_TONE_CLASS_NAMES[statusTone(status)]}`}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
