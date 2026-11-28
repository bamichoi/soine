export type KkiruMeetingStatus =
  | 'meeting'
  | 'contracting'
  | 'contracted'
  | 'contract_cancelled'
  | 'stopped';

export type KkiruContractStatus = 'contracting' | 'completed' | 'cancelled';

/** 매물 상태. 걸린 계약과 미팅 상태에서 백엔드가 계산한다. */
export type KkiruListingStatus = 'available' | 'meeting' | 'contracting' | 'contracted';

export const MEETING_STATUS_LABELS: Record<KkiruMeetingStatus, string> = {
  // biome-ignore lint/style/useNamingConvention: API 상태 값 그대로 쓴다.
  contract_cancelled: '계약취소',
  contracted: '계약완료',
  contracting: '계약중',
  meeting: '미팅중',
  stopped: '진행중단',
};

export const CONTRACT_STATUS_LABELS: Record<KkiruContractStatus, string> = {
  cancelled: '계약취소',
  completed: '계약완료',
  contracting: '계약예정',
};

export const LISTING_STATUS_LABELS: Record<KkiruListingStatus, string> = {
  available: '계약가능',
  contracted: '계약완료',
  contracting: '계약중',
  meeting: '미팅중',
};

export const LISTING_STATUSES: KkiruListingStatus[] = [
  'available',
  'meeting',
  'contracting',
  'contracted',
];

/** 상태 배지 색. 진행 단계(파랑), 완료(초록), 멈춤·취소(회색·빨강) */
export const STATUS_TONE_CLASS_NAMES = {
  active: 'bg-[var(--brand-soft)] text-[var(--brand)]',
  done: 'bg-[var(--success-soft)] text-[var(--success)]',
  idle: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  muted: 'bg-[var(--background)] text-[var(--muted)]',
  negative: 'bg-[var(--error-soft)] text-[var(--error)]',
} as const;

export type StatusTone = keyof typeof STATUS_TONE_CLASS_NAMES;

const TONES: Record<string, StatusTone> = {
  available: 'idle',
  cancelled: 'negative',
  completed: 'done',
  // biome-ignore lint/style/useNamingConvention: API 상태 값 그대로 쓴다.
  contract_cancelled: 'negative',
  contracted: 'done',
  contracting: 'active',
  meeting: 'active',
  stopped: 'muted',
};

export function statusTone(status: string): StatusTone {
  return TONES[status] ?? 'muted';
}
