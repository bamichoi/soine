import type { StatusTone } from '@/lib/ui';

export type GoodplaceMeetingStatus =
  | 'meeting'
  | 'contracting'
  | 'contracted'
  | 'contract_cancelled'
  | 'stopped';

export type GoodplaceContractStatus = 'contracting' | 'completed' | 'cancelled';

/** 매물 상태. 걸린 계약과 미팅 상태에서 백엔드가 계산한다. */
export type GoodplaceListingStatus = 'available' | 'meeting' | 'contracting' | 'contracted';

export const MEETING_STATUS_LABELS: Record<GoodplaceMeetingStatus, string> = {
  // biome-ignore lint/style/useNamingConvention: API 상태 값 그대로 쓴다.
  contract_cancelled: '계약취소',
  contracted: '계약완료',
  contracting: '계약중',
  meeting: '미팅중',
  stopped: '진행중단',
};

export const CONTRACT_STATUS_LABELS: Record<GoodplaceContractStatus, string> = {
  cancelled: '계약취소',
  completed: '계약완료',
  contracting: '계약예정',
};

export const LISTING_STATUS_LABELS: Record<GoodplaceListingStatus, string> = {
  available: '계약가능',
  contracted: '계약완료',
  contracting: '계약중',
  meeting: '미팅중',
};

/** 필터 칩에 보이는 순서 (진행 단계 순) */
export const MEETING_STATUSES: GoodplaceMeetingStatus[] = [
  'meeting',
  'contracting',
  'contracted',
  'contract_cancelled',
  'stopped',
];

/** 필터 칩에 보이는 순서 (진행 단계 순) */
export const CONTRACT_STATUSES: GoodplaceContractStatus[] = [
  'contracting',
  'completed',
  'cancelled',
];

export const LISTING_STATUSES: GoodplaceListingStatus[] = [
  'available',
  'meeting',
  'contracting',
  'contracted',
];

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
