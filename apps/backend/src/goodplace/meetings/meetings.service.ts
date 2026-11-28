import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_PAGE_SIZE, type Pagination, toPagination } from '../../common/page-size';
import { generateRandomCode, normalizeRandomCode } from '../../common/random-code';
import {
  type GoodplaceContractStatus,
  type GoodplaceCustomer,
  type GoodplaceInflowSource,
  type GoodplaceMeeting,
  type GoodplaceMeetingRecordKind,
  type GoodplaceMeetingStatus,
  Prisma,
} from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { toDateOnly, toDateString, toSeoulDate } from '../common/goodplace-fields';
import { pickSearch, type SortOrder } from '../common/list-query';
import type { LogRecordDto } from '../common/log-record.dto';
import {
  CONTRACTABLE_MEETING_STATUSES,
  lockRow,
  syncListingStatus,
  syncMeetingAndListings,
} from '../common/status-sync';
import { type ListingOption, toListingOption } from '../listings/listings.service';
import type {
  CreateMeetingDto,
  ListMeetingsQueryDto,
  MeetingFieldsDto,
  MeetingSearchField,
  MeetingSortField,
  UpdateMeetingDto,
} from './dto/meeting.dto';

const CODE_GENERATION_ATTEMPTS = 5;

export type MeetingRecord = {
  id: string;
  kind: GoodplaceMeetingRecordKind;
  recordedOn: string;
  content: string;
  /** 관련 매물 (선택) */
  listing: { id: string; code: string; name: string } | null;
  createdAt: string;
};

export type MeetingSummary = {
  id: string;
  /** 케이스 번호 */
  code: string;
  title: string;
  customer: { code: string; name: string; phone: string };
  interestArea: string;
  desiredBusiness: string;
  /** 예산 = 최대 보증금 + 최대 권리금 (만원) */
  budget: number;
  /** 미팅 일시 */
  meetAt: string;
  status: GoodplaceMeetingStatus;
};

export type MeetingContract = {
  id: string;
  contractedOn: string;
  status: GoodplaceContractStatus;
  listing: { id: string; code: string; name: string };
};

export type MeetingDetail = MeetingSummary & {
  desiredPyeongMin: number;
  desiredPyeongMax: number;
  desiredFloor: string;
  desiredRent: number;
  maxDeposit: number;
  maxPremium: number;
  inflowSource: GoodplaceInflowSource;
  inflowSourceDetail: string | null;
  stoppedAt: string | null;
  records: MeetingRecord[];
  /** 미팅 매물. contractStatus는 이 매물로 이 미팅에서 만든 가장 최근 계약의 상태 */
  listings: (ListingOption & { addedAt: string; contractStatus: GoodplaceContractStatus | null })[];
  /** 이 미팅의 계약 (최근 순, 취소된 계약 포함) */
  contracts: MeetingContract[];
  /** 지금 새 계약을 만들 수 있는지 (미팅중이거나 계약이 취소된 뒤) */
  canStartContract: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MeetingListResponse = {
  items: MeetingSummary[];
  pagination: Pagination;
};

const RECORD_ORDER = [
  { recordedOn: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.GoodplaceMeetingRecordOrderByWithRelationInput[];

/** 미팅 기록을 읽을 때 함께 가져올 관련 매물 */
export const RECORD_INCLUDE = {
  listing: { select: { code: true, id: true, name: true } },
} satisfies Prisma.GoodplaceMeetingRecordInclude;

const DETAIL_INCLUDE = {
  contracts: {
    orderBy: [{ createdAt: 'desc' }],
    select: {
      contractedOn: true,
      id: true,
      listing: { select: { code: true, id: true, name: true } },
      status: true,
    },
  },
  customer: true,
  listings: { include: { listing: true }, orderBy: { createdAt: 'asc' } },
  records: { include: RECORD_INCLUDE, orderBy: RECORD_ORDER },
} satisfies Prisma.GoodplaceMeetingInclude;

type MeetingWithDetail = Prisma.GoodplaceMeetingGetPayload<{ include: typeof DETAIL_INCLUDE }>;

export function toMeetingRecord(record: {
  id: string;
  kind: GoodplaceMeetingRecordKind;
  recordedOn: Date;
  content: string;
  createdAt: Date;
  listing: { id: string; code: string; name: string } | null;
}): MeetingRecord {
  return {
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    kind: record.kind,
    listing: record.listing
      ? { code: record.listing.code, id: record.listing.id, name: record.listing.name }
      : null,
    recordedOn: toDateString(record.recordedOn),
  };
}

function toSummary(meeting: GoodplaceMeeting & { customer: GoodplaceCustomer }): MeetingSummary {
  return {
    budget: meeting.maxDeposit + meeting.maxPremium,
    code: meeting.code,
    customer: {
      code: meeting.customer.code,
      name: meeting.customer.name,
      phone: meeting.customer.phone,
    },
    desiredBusiness: meeting.desiredBusiness,
    id: meeting.id,
    interestArea: meeting.interestArea,
    meetAt: meeting.meetAt.toISOString(),
    status: meeting.status,
    title: meeting.title,
  };
}

function toDetail(meeting: MeetingWithDetail): MeetingDetail {
  return {
    ...toSummary(meeting),
    canStartContract: CONTRACTABLE_MEETING_STATUSES.includes(meeting.status),
    contracts: meeting.contracts.map((contract) => ({
      contractedOn: toDateString(contract.contractedOn),
      id: contract.id,
      listing: contract.listing,
      status: contract.status,
    })),
    createdAt: meeting.createdAt.toISOString(),
    desiredFloor: meeting.desiredFloor,
    desiredPyeongMax: meeting.desiredPyeongMax.toNumber(),
    desiredPyeongMin: meeting.desiredPyeongMin.toNumber(),
    desiredRent: meeting.desiredRent,
    inflowSource: meeting.inflowSource,
    inflowSourceDetail: meeting.inflowSourceDetail,
    listings: meeting.listings.map(({ createdAt, listing }) => ({
      ...toListingOption(listing),
      addedAt: createdAt.toISOString(),
      // 계약은 최근 순이므로 처음 찾은 계약이 가장 최근 계약이다.
      contractStatus:
        meeting.contracts.find((contract) => contract.listing.id === listing.id)?.status ?? null,
    })),
    maxDeposit: meeting.maxDeposit,
    maxPremium: meeting.maxPremium,
    records: meeting.records.map(toMeetingRecord),
    stoppedAt: meeting.stoppedAt?.toISOString() ?? null,
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

function toFieldData(input: MeetingFieldsDto) {
  if (input.desiredPyeongMin > input.desiredPyeongMax) {
    throw new BadRequestException('desiredPyeongMin must not exceed desiredPyeongMax');
  }

  return {
    desiredBusiness: input.desiredBusiness,
    desiredFloor: input.desiredFloor,
    desiredPyeongMax: new Prisma.Decimal(input.desiredPyeongMax),
    desiredPyeongMin: new Prisma.Decimal(input.desiredPyeongMin),
    desiredRent: input.desiredRent,
    inflowSource: input.inflowSource,
    inflowSourceDetail: input.inflowSource === 'other' ? (input.inflowSourceDetail ?? null) : null,
    interestArea: input.interestArea,
    maxDeposit: input.maxDeposit,
    maxPremium: input.maxPremium,
    meetAt: new Date(input.meetAt),
    title: input.title,
  };
}

/** 케이스 번호·제목·고객 이름·연락처·관심 상권·희망 업종으로 찾는다. field로 한 항목만 고를 수 있다. */
export function buildMeetingSearch(
  query: string,
  field: MeetingSearchField = 'all',
): Prisma.GoodplaceMeetingWhereInput {
  if (!query) {
    return {};
  }

  const contains = { contains: query, mode: 'insensitive' as const };
  const code = normalizeRandomCode(query);
  const digits = query.replace(/\D/g, '');

  return pickSearch<Prisma.GoodplaceMeetingWhereInput>(
    {
      code: code ? { code: { contains: code } } : null,
      customer: { customer: { name: contains } },
      desiredBusiness: { desiredBusiness: contains },
      interestArea: { interestArea: contains },
      phone: digits.length >= 3 ? { customer: { phone: { contains: digits } } } : null,
      title: { title: contains },
    },
    field,
  );
}

const MEETING_ORDER_BY: Record<
  MeetingSortField,
  (order: SortOrder) => Prisma.GoodplaceMeetingOrderByWithRelationInput
> = {
  customer: (order) => ({ customer: { name: order } }),
  desiredBusiness: (order) => ({ desiredBusiness: order }),
  interestArea: (order) => ({ interestArea: order }),
  meetAt: (order) => ({ meetAt: order }),
  status: (order) => ({ status: order }),
  title: (order) => ({ title: order }),
};

function meetingNotFound() {
  return new NotFoundException('Meeting not found');
}

function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes(field)
  );
}

@Injectable()
export class GoodplaceMeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    size = DEFAULT_PAGE_SIZE,
    q = '',
    sort = 'meetAt',
    status,
  }: ListMeetingsQueryDto = {}): Promise<MeetingListResponse> {
    const where = { ...buildMeetingSearch(q, field), ...(status ? { status } : {}) };
    const [total, meetings] = await this.prisma.$transaction([
      this.prisma.goodplaceMeeting.count({ where }),
      this.prisma.goodplaceMeeting.findMany({
        include: { customer: true },
        orderBy: [MEETING_ORDER_BY[sort](order), { meetAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * size,
        take: size,
        where,
      }),
    ]);

    return { items: meetings.map(toSummary), pagination: toPagination(page, size, total) };
  }

  async findByCode(rawCode: string): Promise<MeetingDetail> {
    const code = normalizeRandomCode(rawCode);
    const meeting = code
      ? await this.prisma.goodplaceMeeting.findUnique({ include: DETAIL_INCLUDE, where: { code } })
      : null;

    if (!meeting) {
      throw meetingNotFound();
    }

    return toDetail(meeting);
  }

  /** 미팅을 만든다. 미팅 내용은 로그의 첫 기록(미팅 날짜)이 된다. */
  async create(input: CreateMeetingDto): Promise<MeetingDetail> {
    const customerCode = normalizeRandomCode(input.customerCode);
    const customer = customerCode
      ? await this.prisma.goodplaceCustomer.findUnique({
          select: { id: true },
          where: { code: customerCode },
        })
      : null;

    if (!customer) {
      throw new BadRequestException('Unknown customer');
    }

    const data = toFieldData(input);

    for (let attempt = 1; ; attempt += 1) {
      try {
        const meeting = await this.prisma.goodplaceMeeting.create({
          data: {
            ...data,
            code: generateRandomCode(),
            customerId: customer.id,
            records: {
              create: [
                { content: input.content, kind: 'note', recordedOn: toSeoulDate(data.meetAt) },
              ],
            },
          },
        });

        return this.findByCode(meeting.code);
      } catch (error) {
        if (!isUniqueViolation(error, 'code') || attempt >= CODE_GENERATION_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  /** 미팅 항목을 고친다. 고객과 상태는 바꾸지 않는다. */
  async update(rawCode: string, input: UpdateMeetingDto): Promise<MeetingDetail> {
    const meeting = await this.requireMeeting(rawCode);

    await this.prisma.goodplaceMeeting.update({
      data: toFieldData(input),
      where: { id: meeting.id },
    });

    return this.findByCode(meeting.code);
  }

  async addRecord(rawCode: string, input: LogRecordDto): Promise<MeetingDetail> {
    const meeting = await this.requireMeeting(rawCode);
    const listingId = input.listingId ?? null;

    if (listingId) {
      await this.requireMeetingListing(meeting.id, listingId);
    }

    await this.prisma.goodplaceMeetingRecord.create({
      data: {
        content: input.content,
        kind: 'note',
        listingId,
        meetingId: meeting.id,
        recordedOn: toDateOnly(input.recordedOn),
      },
    });

    return this.findByCode(meeting.code);
  }

  /**
   * 로그 기록을 고친다. 기록은 지우지 않는다.
   * 관련 매물은 null이면 끊고, 보내지 않으면 그대로 둔다. 새로 고르는 매물은 미팅 매물이어야 하고,
   * 이미 연결된 매물은 그사이 미팅 매물에서 빠졌어도 그대로 둘 수 있다.
   */
  async updateRecord(
    rawCode: string,
    recordId: string,
    input: LogRecordDto,
  ): Promise<MeetingDetail> {
    const meeting = await this.requireMeeting(rawCode);
    const record = await this.prisma.goodplaceMeetingRecord.findFirst({
      select: { listingId: true },
      where: { id: recordId, meetingId: meeting.id },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    if (input.listingId && input.listingId !== record.listingId) {
      await this.requireMeetingListing(meeting.id, input.listingId);
    }

    await this.prisma.goodplaceMeetingRecord.update({
      data: {
        content: input.content,
        recordedOn: toDateOnly(input.recordedOn),
        ...(input.listingId === undefined ? {} : { listingId: input.listingId }),
      },
      where: { id: recordId },
    });

    return this.findByCode(meeting.code);
  }

  /** 미팅 매물을 더한다. 계약완료된 매물은 더할 수 없다. 더한 매물은 상태를 다시 맞춘다(미팅중). */
  async addListing(rawCode: string, listingId: string): Promise<MeetingDetail> {
    const meeting = await this.requireMeeting(rawCode);

    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'meetings', meeting.id);
      const listing = await tx.goodplaceListing.findUnique({
        select: { id: true },
        where: { id: listingId },
      });

      if (!listing) {
        throw new BadRequestException('Unknown listing');
      }

      await lockRow(tx, 'listings', listingId);
      const locked = await tx.goodplaceListing.findUniqueOrThrow({
        select: { status: true },
        where: { id: listingId },
      });

      if (locked.status === 'contracted') {
        throw new ConflictException('Listing is already contracted');
      }

      const existing = await tx.goodplaceMeetingListing.findUnique({
        select: { listingId: true },
        // biome-ignore lint/style/useNamingConvention: Prisma compound key name.
        where: { meetingId_listingId: { listingId, meetingId: meeting.id } },
      });

      // 이미 더한 매물이면 그대로 둔다.
      if (!existing) {
        await tx.goodplaceMeetingListing.create({ data: { listingId, meetingId: meeting.id } });
        await syncListingStatus(tx, listingId);
      }
    });

    return this.findByCode(meeting.code);
  }

  /**
   * 잘못 더한 미팅 매물을 뺀다. 연결만 끊고 매물은 그대로 둔다. 계약이 걸린 매물은 뺄 수 없다.
   * 이 매물을 관련 매물로 남긴 기록은 이력이므로 연결을 그대로 둔다.
   */
  async removeListing(rawCode: string, listingId: string): Promise<MeetingDetail> {
    const meeting = await this.requireMeeting(rawCode);

    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'meetings', meeting.id);
      const contractCount = await tx.goodplaceContract.count({
        where: { listingId, meetingId: meeting.id },
      });

      if (contractCount > 0) {
        throw new ConflictException('Listing has a contract in this meeting');
      }

      const { count } = await tx.goodplaceMeetingListing.deleteMany({
        where: { listingId, meetingId: meeting.id },
      });

      if (count === 0) {
        throw new NotFoundException('Listing is not in this meeting');
      }

      await lockRow(tx, 'listings', listingId);
      await syncListingStatus(tx, listingId);
    });

    return this.findByCode(meeting.code);
  }

  /** 미팅 중단: 미팅중·계약취소 상태에서만. 사유를 로그에 남기고 중단 시각을 채운다. */
  stop(rawCode: string, reason: string): Promise<MeetingDetail> {
    return this.changeStopped(rawCode, 'stop', reason);
  }

  /** 미팅 재개: 진행중단 상태에서만. 사유를 로그에 남기고 중단 시각을 비운 뒤 상태를 다시 맞춘다. */
  resume(rawCode: string, reason: string): Promise<MeetingDetail> {
    return this.changeStopped(rawCode, 'resume', reason);
  }

  private async changeStopped(
    rawCode: string,
    action: 'stop' | 'resume',
    reason: string,
  ): Promise<MeetingDetail> {
    const meeting = await this.requireMeeting(rawCode);

    await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'meetings', meeting.id);
      // 잠근 뒤 다시 읽어 그사이 바뀐 상태를 반영한다.
      const locked = await tx.goodplaceMeeting.findUniqueOrThrow({
        select: { status: true },
        where: { id: meeting.id },
      });
      const canChange =
        action === 'stop'
          ? CONTRACTABLE_MEETING_STATUSES.includes(locked.status)
          : locked.status === 'stopped';

      if (!canChange) {
        throw new ConflictException(`Meeting status ${locked.status} cannot ${action}`);
      }

      const now = new Date();
      await tx.goodplaceMeeting.update({
        data: { stoppedAt: action === 'stop' ? now : null },
        where: { id: meeting.id },
      });
      await tx.goodplaceMeetingRecord.create({
        data: {
          content: reason,
          kind: action === 'stop' ? 'stopped' : 'resumed',
          meetingId: meeting.id,
          recordedOn: toSeoulDate(now),
        },
      });
      await syncMeetingAndListings(tx, meeting.id);
    });

    return this.findByCode(meeting.code);
  }

  /** 관련 매물은 그 미팅의 미팅 매물이어야 한다. */
  private async requireMeetingListing(meetingId: string, listingId: string): Promise<void> {
    const link = await this.prisma.goodplaceMeetingListing.findUnique({
      select: { listingId: true },
      // biome-ignore lint/style/useNamingConvention: Prisma compound key name.
      where: { meetingId_listingId: { listingId, meetingId } },
    });

    if (!link) {
      throw new BadRequestException('Listing is not in this meeting');
    }
  }

  private async requireMeeting(rawCode: string): Promise<{ id: string; code: string }> {
    const code = normalizeRandomCode(rawCode);
    const meeting = code
      ? await this.prisma.goodplaceMeeting.findUnique({
          select: { code: true, id: true },
          where: { code },
        })
      : null;

    if (!meeting) {
      throw meetingNotFound();
    }

    return meeting;
  }
}
