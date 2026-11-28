import { Icon } from '@/components/icon';
import { formatPhone } from '@/lib/phone';

type PhoneNumberProps = {
  /** 숫자만 담긴 전화번호 */
  phone: string;
  /** 번호 글자에 줄 클래스 (예: 흐린 색) */
  className?: string;
};

// 전화번호를 보여 주고, 모바일에서는 옆에 바로 전화를 거는 버튼을 붙인다.
export function PhoneNumber({ phone, className = '' }: PhoneNumberProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 align-middle">
      <span className={`tabular-nums ${className}`}>{formatPhone(phone)}</span>
      <a
        aria-label={`${formatPhone(phone)}로 전화 걸기`}
        className="inline-flex h-7 items-center gap-1 border border-[var(--brand)] px-2.5 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)] md:hidden"
        href={`tel:${phone}`}
      >
        <Icon className="size-3.5" name="phone" />
        전화 걸기
      </a>
    </span>
  );
}
