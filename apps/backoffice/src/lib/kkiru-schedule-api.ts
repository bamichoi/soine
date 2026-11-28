import { requestAdminApi } from '@/lib/admin-auth-api';
import type { KkiruContractStatus, KkiruMeetingStatus } from '@/lib/kkiru-status';

type ScheduleCase = {
  id: string;
  /** 한국 날짜 (YYYY-MM-DD) */
  date: string;
  /** 케이스(상담) 번호 */
  caseCode: string;
  customerName: string;
  listingName: string;
};

export type KkiruScheduleItem =
  | (ScheduleCase & { kind: 'meeting'; meetAt: string; status: KkiruMeetingStatus })
  | (ScheduleCase & { kind: 'contract'; status: KkiruContractStatus });

/** 기간(from 이상 to 미만) 안의 미팅·계약 일정. 진행중단 미팅과 취소된 계약은 빠진다. */
export async function listKkiruSchedule(from: string, to: string): Promise<KkiruScheduleItem[]> {
  const response = await requestAdminApi(`kkiru/schedule?${new URLSearchParams({ from, to })}`);

  return (await response.json()) as KkiruScheduleItem[];
}
