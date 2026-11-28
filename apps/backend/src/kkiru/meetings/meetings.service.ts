import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeRandomCode } from '../../common/random-code';
import type {
  KkiruContractStatus,
  KkiruMeetingRecordKind,
  KkiruMeetingStatus,
  Prisma,
} from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { KKIRU_PAGE_SIZE, toDateOnly, toDateString, toPagination } from '../common/kkiru-fields';
import { pickSearch, type SortOrder } from '../common/list-query';
import type { LogRecordDto } from '../common/log-record.dto';
import { lockRow, syncConsultationStatus, syncListingStatus } from '../common/status-sync';
import { type ListingOption, toListingOption } from '../listings/listings.service';
import type {
  CreateMeetingDto,
  ListMeetingsQueryDto,
  MeetingSearchField,
  MeetingSortField,
  UpdateMeetingDto,
} from './dto/meeting.dto';

export type MeetingRecord = {
  id: string;
  kind: KkiruMeetingRecordKind;
  recordedOn: string;
  content: string;
  createdAt: string;
};

export type MeetingSummary = {
  id: string;
  /** 케이스 번호 (상담과 같다) */
  caseCode: string;
  consultationTitle: string;
  customer: { code: string; name: string; phone: string };
  listing: { code: string; name: string };
  meetAt: string;
  status: KkiruMeetingStatus;
};

export type MeetingDetail = Omit<MeetingSummary, 'listing'> & {
  listing: ListingOption & { clientName: string; clientPhone: string };
  records: MeetingRecord[];
  /** 이 미팅의 계약 (최근 순) */
  contracts: { id: string; contractedOn: string; status: KkiruContractStatus }[];
  /** 지금 새 계약을 만들 수 있는지 (미팅중이거나 계약이 취소된 뒤) */
  canStartContract: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MeetingListResponse = {
  items: MeetingSummary[];
  pagination: ReturnType<typeof toPagination>;
};

const SUMMARY_INCLUDE = {
  consultation: { include: { customer: true } },
  listing: true,
} satisfies Prisma.KkiruMeetingInclude;

const DETAIL_INCLUDE = {
  ...SUMMARY_INCLUDE,
  contracts: {
    orderBy: [{ createdAt: 'desc' }],
    select: { contractedOn: true, id: true, status: true },
  },
  records: { orderBy: [{ recordedOn: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.KkiruMeetingInclude;

type MeetingWithSummary = Prisma.KkiruMeetingGetPayload<{ include: typeof SUMMARY_INCLUDE }>;
type MeetingWithDetail = Prisma.KkiruMeetingGetPayload<{ include: typeof DETAIL_INCLUDE }>;

/** 새 계약은 미팅중이거나 계약이 취소된 미팅에서만 만든다. */
export const CONTRACTABLE_MEETING_STATUSES: KkiruMeetingStatus[] = [
  'meeting',
  'contract_cancelled',
];

function toSummary(meeting: MeetingWithSummary): MeetingSummary {
  const { customer } = meeting.consultation;

  return {
    caseCode: meeting.consultation.code,
    consultationTitle: meeting.consultation.title,
    customer: { code: customer.code, name: customer.name, phone: customer.phone },
    id: meeting.id,
    listing: { code: meeting.listing.code, name: meeting.listing.name },
    meetAt: meeting.meetAt.toISOString(),
    status: meeting.status,
  };
}

export function toMeetingRecord(record: {
  id: string;
  kind: KkiruMeetingRecordKind;
  recordedOn: Date;
  content: string;
  createdAt: Date;
}): MeetingRecord {
  return {
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    kind: record.kind,
    recordedOn: toDateString(record.recordedOn),
  };
}

function toDetail(meeting: MeetingWithDetail): MeetingDetail {
  return {
    ...toSummary(meeting),
    canStartContract: CONTRACTABLE_MEETING_STATUSES.includes(meeting.status),
    contracts: meeting.contracts.map((contract) => ({
      contractedOn: toDateString(contract.contractedOn),
      id: contract.id,
      status: contract.status,
    })),
    createdAt: meeting.createdAt.toISOString(),
    listing: {
      ...toListingOption(meeting.listing),
      clientName: meeting.listing.clientName,
      clientPhone: meeting.listing.clientPhone,
    },
    records: meeting.records.map(toMeetingRecord),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

/** 케이스 번호·고객 이름·매물(이름·번호)·상담 제목으로 찾는다. field로 한 항목만 고를 수 있다. */
export function buildMeetingSearch(
  query: string,
  field: MeetingSearchField = 'all',
): Prisma.KkiruMeetingWhereInput {
  if (!query) {
    return {};
  }

  const contains = { contains: query, mode: 'insensitive' as const };
  const code = normalizeRandomCode(query);
  const listingByName: Prisma.KkiruMeetingWhereInput = { listing: { name: contains } };

  return pickSearch<Prisma.KkiruMeetingWhereInput>(
    {
      caseCode: code ? { consultation: { code: { contains: code } } } : null,
      consultationTitle: { consultation: { title: contains } },
      customer: { consultation: { customer: { name: contains } } },
      listing: code
        ? // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
          { OR: [listingByName, { listing: { code: { contains: code } } }] }
        : listingByName,
    },
    field,
  );
}

const MEETING_ORDER_BY: Record<
  MeetingSortField,
  (order: SortOrder) => Prisma.KkiruMeetingOrderByWithRelationInput
> = {
  consultationTitle: (order) => ({ consultation: { title: order } }),
  customer: (order) => ({ consultation: { customer: { name: order } } }),
  listing: (order) => ({ listing: { name: order } }),
  meetAt: (order) => ({ meetAt: order }),
  status: (order) => ({ status: order }),
};

function meetingNotFound() {
  return new NotFoundException('Meeting not found');
}

async function requireAvailableListing(
  tx: Prisma.TransactionClient,
  listingId: string,
): Promise<void> {
  const listing = await tx.kkiruListing.findUnique({
    select: { status: true },
    where: { id: listingId },
  });

  if (!listing) {
    throw new BadRequestException('Unknown listing');
  }

  // 다른 고객이 미팅·계약 중인 매물도 미팅은 잡을 수 있다. 계약완료된 매물만 막는다.
  if (listing.status === 'contracted') {
    throw new ConflictException('Listing is already contracted');
  }
}

@Injectable()
export class KkiruMeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    q = '',
    sort = 'meetAt',
    status,
  }: ListMeetingsQueryDto = {}): Promise<MeetingListResponse> {
    const where = { ...buildMeetingSearch(q, field), ...(status ? { status } : {}) };
    const [total, meetings] = await this.prisma.$transaction([
      this.prisma.kkiruMeeting.count({ where }),
      this.prisma.kkiruMeeting.findMany({
        include: SUMMARY_INCLUDE,
        orderBy: [MEETING_ORDER_BY[sort](order), { meetAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * KKIRU_PAGE_SIZE,
        take: KKIRU_PAGE_SIZE,
        where,
      }),
    ]);

    return { items: meetings.map(toSummary), pagination: toPagination(page, total) };
  }

  async findById(id: string): Promise<MeetingDetail> {
    const meeting = await this.prisma.kkiruMeeting.findUnique({
      include: DETAIL_INCLUDE,
      where: { id },
    });

    if (!meeting) {
      throw meetingNotFound();
    }

    return toDetail(meeting);
  }

  /** 미팅 진행: 미팅을 만들고 상담 상태를 다시 맞춘다(미팅중). */
  async create(input: CreateMeetingDto): Promise<MeetingDetail> {
    const code = normalizeRandomCode(input.consultationCode);
    const consultation = code
      ? await this.prisma.kkiruConsultation.findUnique({ select: { id: true }, where: { code } })
      : null;

    if (!consultation) {
      throw new BadRequestException('Unknown consultation');
    }

    const meetAt = new Date(input.meetAt);
    const id = await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'consultations', consultation.id);
      await requireAvailableListing(tx, input.listingId);

      const meeting = await tx.kkiruMeeting.create({
        data: {
          consultationId: consultation.id,
          listingId: input.listingId,
          meetAt,
          records: {
            create: [{ content: input.content, kind: 'note', recordedOn: toSeoulDate(meetAt) }],
          },
        },
      });
      await syncConsultationStatus(tx, consultation.id);
      await syncListingStatus(tx, input.listingId);

      return meeting.id;
    });

    return this.findById(id);
  }

  /** 미팅 일시·대상 매물을 고친다. 계약이 진행 중이거나 끝났으면 매물은 바꿀 수 없다. */
  async update(id: string, input: UpdateMeetingDto): Promise<MeetingDetail> {
    await this.prisma.$transaction(async (tx) => {
      const meeting = await this.lockMeeting(tx, id);

      if (input.listingId !== meeting.listingId) {
        if (!['meeting', 'stopped'].includes(meeting.status)) {
          throw new ConflictException('Listing cannot change after a contract');
        }

        await requireAvailableListing(tx, input.listingId);
      }

      await tx.kkiruMeeting.update({
        data: { listingId: input.listingId, meetAt: new Date(input.meetAt) },
        where: { id },
      });

      // 매물을 바꿨으면 이전 매물과 새 매물의 상태를 둘 다 다시 맞춘다.
      if (input.listingId !== meeting.listingId) {
        await syncListingStatus(tx, meeting.listingId);
        await syncListingStatus(tx, input.listingId);
      }
    });

    return this.findById(id);
  }

  async addRecord(id: string, input: LogRecordDto): Promise<MeetingDetail> {
    await this.requireMeeting(id);
    await this.prisma.kkiruMeetingRecord.create({
      data: {
        content: input.content,
        kind: 'note',
        meetingId: id,
        recordedOn: toDateOnly(input.recordedOn),
      },
    });

    return this.findById(id);
  }

  /** 로그 기록을 고친다. 기록은 지우지 않는다. */
  async updateRecord(id: string, recordId: string, input: LogRecordDto): Promise<MeetingDetail> {
    const { count } = await this.prisma.kkiruMeetingRecord.updateMany({
      data: { content: input.content, recordedOn: toDateOnly(input.recordedOn) },
      where: { id: recordId, meetingId: id },
    });

    if (count === 0) {
      throw new NotFoundException('Record not found');
    }

    return this.findById(id);
  }

  /** 미팅중단: 사유를 로그에 남기고 진행중단으로 바꾼다. */
  stop(id: string, reason: string): Promise<MeetingDetail> {
    return this.changeStatus(id, 'meeting', 'stopped', 'stopped', reason);
  }

  /** 미팅재개: 사유를 로그에 남기고 미팅중으로 되돌린다. */
  resume(id: string, reason: string): Promise<MeetingDetail> {
    return this.changeStatus(id, 'stopped', 'meeting', 'resumed', reason);
  }

  private async changeStatus(
    id: string,
    from: KkiruMeetingStatus,
    to: KkiruMeetingStatus,
    kind: KkiruMeetingRecordKind,
    reason: string,
  ): Promise<MeetingDetail> {
    await this.prisma.$transaction(async (tx) => {
      const meeting = await this.lockMeeting(tx, id);

      if (meeting.status !== from) {
        throw new ConflictException(`Meeting status must be ${from} but is ${meeting.status}`);
      }

      await tx.kkiruMeeting.update({ data: { status: to }, where: { id } });
      await tx.kkiruMeetingRecord.create({
        data: { content: reason, kind, meetingId: id, recordedOn: toSeoulDate(new Date()) },
      });
      await syncConsultationStatus(tx, meeting.consultationId);
      await syncListingStatus(tx, meeting.listingId);
    });

    return this.findById(id);
  }

  private async lockMeeting(tx: Prisma.TransactionClient, id: string) {
    const meeting = await tx.kkiruMeeting.findUnique({
      select: { consultationId: true, listingId: true, status: true },
      where: { id },
    });

    if (!meeting) {
      throw meetingNotFound();
    }

    await lockRow(tx, 'consultations', meeting.consultationId);
    await lockRow(tx, 'meetings', id);

    // 잠근 뒤 다시 읽어 그사이 바뀐 상태를 반영한다.
    return tx.kkiruMeeting.findUniqueOrThrow({
      select: { consultationId: true, listingId: true, status: true },
      where: { id },
    });
  }

  private async requireMeeting(id: string): Promise<void> {
    const meeting = await this.prisma.kkiruMeeting.findUnique({
      select: { id: true },
      where: { id },
    });

    if (!meeting) {
      throw meetingNotFound();
    }
  }
}

/** 시각의 한국 날짜 (DATE 컬럼용, UTC 자정) */
export function toSeoulDate(date: Date): Date {
  const seoul = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return toDateOnly(seoul.toISOString().slice(0, 10));
}
