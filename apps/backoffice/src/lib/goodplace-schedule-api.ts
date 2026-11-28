import { requestAdminApi } from '@/lib/admin-auth-api';
import type { GoodplaceContractStatus, GoodplaceMeetingStatus } from '@/lib/goodplace-status';

type ScheduleCase = {
  id: string;
  /** 한국 날짜 (YYYY-MM-DD) */
  date: string;
  /** 케이스(미팅) 번호 */
  caseCode: string;
  customerName: string;
};

export type GoodplaceScheduleItem =
  | (ScheduleCase & {
      kind: 'meeting';
      meetAt: string;
      status: GoodplaceMeetingStatus;
      /** 미팅 제목 */
      title: string;
    })
  | (ScheduleCase & { kind: 'contract'; status: GoodplaceContractStatus; listingName: string })
  | (ScheduleCase & {
      /** 잔금일. id는 계약 id다. */
      kind: 'balance';
      status: GoodplaceContractStatus;
      listingName: string;
      /** 잔금(만원) */
      balance: number;
    });

/** 기간(from 이상 to 미만) 안의 미팅·계약·잔금 일정. 진행중단 미팅과 취소된 계약은 빠진다. */
export async function listGoodplaceSchedule(
  from: string,
  to: string,
): Promise<GoodplaceScheduleItem[]> {
  const response = await requestAdminApi(`goodplace/schedule?${new URLSearchParams({ from, to })}`);

  return (await response.json()) as GoodplaceScheduleItem[];
}
