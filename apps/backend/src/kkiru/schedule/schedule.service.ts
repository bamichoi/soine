import { BadRequestException, Injectable } from '@nestjs/common';
import type { KkiruContractStatus, KkiruMeetingStatus } from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { toDateOnly, toDateString } from '../common/kkiru-fields';
import type { ScheduleQueryDto } from './dto/schedule.dto';

/** 한 번에 불러올 수 있는 최대 기간(일). 달력 한 화면은 최대 6주다. */
const MAX_RANGE_DAYS = 62;
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 달력에 보이는 미팅 상태. 진행중단된 미팅은 보이지 않는다. */
const SCHEDULED_MEETING_STATUSES: KkiruMeetingStatus[] = [
  'meeting',
  'contracting',
  'contracted',
  'contract_cancelled',
];
/** 달력에 보이는 계약 상태. 취소된 계약은 보이지 않는다. */
const SCHEDULED_CONTRACT_STATUSES: KkiruContractStatus[] = ['contracting', 'completed'];

export type ScheduleItem =
  | {
      kind: 'meeting';
      id: string;
      /** 한국 날짜 (YYYY-MM-DD) */
      date: string;
      /** 미팅 일시 */
      meetAt: string;
      status: KkiruMeetingStatus;
      caseCode: string;
      customerName: string;
      listingName: string;
    }
  | {
      kind: 'contract';
      id: string;
      /** 계약일 (YYYY-MM-DD) */
      date: string;
      status: KkiruContractStatus;
      caseCode: string;
      customerName: string;
      listingName: string;
    };

function seoulDateRangeToInstants(from: string, to: string) {
  return {
    gte: new Date(toDateOnly(from).getTime() - SEOUL_OFFSET_MS),
    lt: new Date(toDateOnly(to).getTime() - SEOUL_OFFSET_MS),
  };
}

function toSeoulDateString(date: Date): string {
  return new Date(date.getTime() + SEOUL_OFFSET_MS).toISOString().slice(0, 10);
}

const CASE_INCLUDE = {
  consultation: { select: { code: true, customer: { select: { name: true } } } },
  listing: { select: { name: true } },
} as const;

@Injectable()
export class KkiruScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  /** 기간 안의 미팅(미팅 일시 기준)과 계약(계약일 기준)을 시간순으로 돌려준다. */
  async list({ from, to }: ScheduleQueryDto): Promise<ScheduleItem[]> {
    const days = (toDateOnly(to).getTime() - toDateOnly(from).getTime()) / (24 * 60 * 60 * 1000);

    if (days <= 0 || days > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Range must be 1 to ${MAX_RANGE_DAYS} days`);
    }

    const [meetings, contracts] = await this.prisma.$transaction([
      this.prisma.kkiruMeeting.findMany({
        include: CASE_INCLUDE,
        orderBy: [{ meetAt: 'asc' }, { id: 'asc' }],
        where: {
          meetAt: seoulDateRangeToInstants(from, to),
          status: { in: SCHEDULED_MEETING_STATUSES },
        },
      }),
      this.prisma.kkiruContract.findMany({
        include: { meeting: { include: CASE_INCLUDE } },
        orderBy: [{ contractedOn: 'asc' }, { createdAt: 'asc' }],
        where: {
          contractedOn: { gte: toDateOnly(from), lt: toDateOnly(to) },
          status: { in: SCHEDULED_CONTRACT_STATUSES },
        },
      }),
    ]);

    return [
      ...meetings.map(
        (meeting): ScheduleItem => ({
          caseCode: meeting.consultation.code,
          customerName: meeting.consultation.customer.name,
          date: toSeoulDateString(meeting.meetAt),
          id: meeting.id,
          kind: 'meeting',
          listingName: meeting.listing.name,
          meetAt: meeting.meetAt.toISOString(),
          status: meeting.status,
        }),
      ),
      ...contracts.map(
        (contract): ScheduleItem => ({
          caseCode: contract.meeting.consultation.code,
          customerName: contract.meeting.consultation.customer.name,
          date: toDateString(contract.contractedOn),
          id: contract.id,
          kind: 'contract',
          listingName: contract.meeting.listing.name,
          status: contract.status,
        }),
      ),
    ];
  }
}
