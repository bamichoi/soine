import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateRandomCode, normalizeRandomCode } from '../../common/random-code';
import {
  type KkiruConsultation,
  type KkiruConsultationStatus,
  type KkiruContractStatus,
  type KkiruCustomer,
  type KkiruInflowSource,
  type KkiruMeetingStatus,
  Prisma,
} from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { KKIRU_PAGE_SIZE, toDateOnly, toDateString, toPagination } from '../common/kkiru-fields';
import { pickSearch, type SortOrder } from '../common/list-query';
import type { LogRecordDto } from '../common/log-record.dto';
import { type ListingOption, toListingOption } from '../listings/listings.service';
import type {
  ConsultationFieldsDto,
  ConsultationSearchField,
  ConsultationSortField,
  CreateConsultationDto,
  ListConsultationsQueryDto,
  UpdateConsultationDto,
} from './dto/consultation.dto';

const CODE_GENERATION_ATTEMPTS = 5;

export type LogRecord = { id: string; recordedOn: string; content: string; createdAt: string };

export type ConsultationSummary = {
  id: string;
  /** 케이스 번호 */
  code: string;
  title: string;
  customer: { code: string; name: string; phone: string };
  interestArea: string;
  desiredBusiness: string;
  /** 예산 = 최대 보증금 + 최대 권리금 (만원) */
  budget: number;
  consultedOn: string;
  status: KkiruConsultationStatus;
};

export type ConsultationDetail = ConsultationSummary & {
  desiredPyeongMin: number;
  desiredPyeongMax: number;
  desiredFloor: string;
  desiredRent: number;
  maxDeposit: number;
  maxPremium: number;
  inflowSource: KkiruInflowSource;
  inflowSourceDetail: string | null;
  records: LogRecord[];
  /** 상담매물 기록 */
  listings: (ListingOption & { addedAt: string })[];
  /** 이 상담에서 이어진 미팅 (최근 순) */
  meetings: {
    id: string;
    listing: { code: string; name: string };
    meetAt: string;
    status: KkiruMeetingStatus;
    /** 이 미팅의 계약 (최근 순, 취소된 계약 포함) */
    contracts: { id: string; contractedOn: string; status: KkiruContractStatus }[];
  }[];
  createdAt: string;
  updatedAt: string;
};

export type ConsultationListResponse = {
  items: ConsultationSummary[];
  pagination: ReturnType<typeof toPagination>;
};

const RECORD_ORDER = [
  { recordedOn: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.KkiruConsultationRecordOrderByWithRelationInput[];

const DETAIL_INCLUDE = {
  customer: true,
  listings: { include: { listing: true }, orderBy: { createdAt: 'asc' } },
  meetings: {
    include: {
      contracts: {
        orderBy: [{ createdAt: 'desc' }],
        select: { contractedOn: true, id: true, status: true },
      },
      listing: { select: { code: true, name: true } },
    },
    orderBy: [{ meetAt: 'desc' }, { createdAt: 'desc' }],
  },
  records: { orderBy: RECORD_ORDER },
} satisfies Prisma.KkiruConsultationInclude;

type ConsultationWithDetail = Prisma.KkiruConsultationGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;

export function toLogRecord(record: {
  id: string;
  recordedOn: Date;
  content: string;
  createdAt: Date;
}): LogRecord {
  return {
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    recordedOn: toDateString(record.recordedOn),
  };
}

function toSummary(
  consultation: KkiruConsultation & { customer: KkiruCustomer },
): ConsultationSummary {
  return {
    budget: consultation.maxDeposit + consultation.maxPremium,
    code: consultation.code,
    consultedOn: toDateString(consultation.consultedOn),
    customer: {
      code: consultation.customer.code,
      name: consultation.customer.name,
      phone: consultation.customer.phone,
    },
    desiredBusiness: consultation.desiredBusiness,
    id: consultation.id,
    interestArea: consultation.interestArea,
    status: consultation.status,
    title: consultation.title,
  };
}

function toDetail(consultation: ConsultationWithDetail): ConsultationDetail {
  return {
    ...toSummary(consultation),
    createdAt: consultation.createdAt.toISOString(),
    desiredFloor: consultation.desiredFloor,
    desiredPyeongMax: consultation.desiredPyeongMax.toNumber(),
    desiredPyeongMin: consultation.desiredPyeongMin.toNumber(),
    desiredRent: consultation.desiredRent,
    inflowSource: consultation.inflowSource,
    inflowSourceDetail: consultation.inflowSourceDetail,
    listings: consultation.listings.map(({ createdAt, listing }) => ({
      ...toListingOption(listing),
      addedAt: createdAt.toISOString(),
    })),
    maxDeposit: consultation.maxDeposit,
    maxPremium: consultation.maxPremium,
    meetings: consultation.meetings.map((meeting) => ({
      contracts: meeting.contracts.map((contract) => ({
        contractedOn: toDateString(contract.contractedOn),
        id: contract.id,
        status: contract.status,
      })),
      id: meeting.id,
      listing: meeting.listing,
      meetAt: meeting.meetAt.toISOString(),
      status: meeting.status,
    })),
    records: consultation.records.map(toLogRecord),
    updatedAt: consultation.updatedAt.toISOString(),
  };
}

function toFieldData(input: ConsultationFieldsDto) {
  if (input.desiredPyeongMin > input.desiredPyeongMax) {
    throw new BadRequestException('desiredPyeongMin must not exceed desiredPyeongMax');
  }

  return {
    consultedOn: toDateOnly(input.consultedOn),
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
    title: input.title,
  };
}

/** 케이스 번호·제목·고객 이름·연락처·관심 상권·희망 업종으로 찾는다. field로 한 항목만 고를 수 있다. */
export function buildConsultationSearch(
  query: string,
  field: ConsultationSearchField = 'all',
): Prisma.KkiruConsultationWhereInput {
  if (!query) {
    return {};
  }

  const contains = { contains: query, mode: 'insensitive' as const };
  const code = normalizeRandomCode(query);
  const digits = query.replace(/\D/g, '');

  return pickSearch<Prisma.KkiruConsultationWhereInput>(
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

const CONSULTATION_ORDER_BY: Record<
  ConsultationSortField,
  (order: SortOrder) => Prisma.KkiruConsultationOrderByWithRelationInput
> = {
  consultedOn: (order) => ({ consultedOn: order }),
  customer: (order) => ({ customer: { name: order } }),
  desiredBusiness: (order) => ({ desiredBusiness: order }),
  interestArea: (order) => ({ interestArea: order }),
  status: (order) => ({ status: order }),
  title: (order) => ({ title: order }),
};

function consultationNotFound() {
  return new NotFoundException('Consultation not found');
}

function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes(field)
  );
}

@Injectable()
export class KkiruConsultationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    q = '',
    sort = 'consultedOn',
    status,
  }: ListConsultationsQueryDto = {}): Promise<ConsultationListResponse> {
    const where = { ...buildConsultationSearch(q, field), ...(status ? { status } : {}) };
    const [total, consultations] = await this.prisma.$transaction([
      this.prisma.kkiruConsultation.count({ where }),
      this.prisma.kkiruConsultation.findMany({
        include: { customer: true },
        orderBy: [
          CONSULTATION_ORDER_BY[sort](order),
          { consultedOn: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * KKIRU_PAGE_SIZE,
        take: KKIRU_PAGE_SIZE,
        where,
      }),
    ]);

    return { items: consultations.map(toSummary), pagination: toPagination(page, total) };
  }

  async findByCode(rawCode: string): Promise<ConsultationDetail> {
    const code = normalizeRandomCode(rawCode);
    const consultation = code
      ? await this.prisma.kkiruConsultation.findUnique({ include: DETAIL_INCLUDE, where: { code } })
      : null;

    if (!consultation) {
      throw consultationNotFound();
    }

    return toDetail(consultation);
  }

  /** 상담을 만든다. 상담 내용은 로그의 첫 기록이 된다. */
  async create(input: CreateConsultationDto): Promise<ConsultationDetail> {
    const customerCode = normalizeRandomCode(input.customerCode);
    const customer = customerCode
      ? await this.prisma.kkiruCustomer.findUnique({
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
        const consultation = await this.prisma.kkiruConsultation.create({
          data: {
            ...data,
            code: generateRandomCode(),
            customerId: customer.id,
            records: { create: [{ content: input.content, recordedOn: data.consultedOn }] },
          },
        });

        return this.findByCode(consultation.code);
      } catch (error) {
        if (!isUniqueViolation(error, 'code') || attempt >= CODE_GENERATION_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  /** 상담 항목을 고친다. 고객과 상태는 바꾸지 않는다. */
  async update(rawCode: string, input: UpdateConsultationDto): Promise<ConsultationDetail> {
    const consultation = await this.requireConsultation(rawCode);

    await this.prisma.kkiruConsultation.update({
      data: toFieldData(input),
      where: { id: consultation.id },
    });

    return this.findByCode(consultation.code);
  }

  async addRecord(rawCode: string, input: LogRecordDto): Promise<ConsultationDetail> {
    const consultation = await this.requireConsultation(rawCode);

    await this.prisma.kkiruConsultationRecord.create({
      data: {
        consultationId: consultation.id,
        content: input.content,
        recordedOn: toDateOnly(input.recordedOn),
      },
    });

    return this.findByCode(consultation.code);
  }

  /** 로그 기록을 고친다. 기록은 지우지 않는다. */
  async updateRecord(
    rawCode: string,
    recordId: string,
    input: LogRecordDto,
  ): Promise<ConsultationDetail> {
    const consultation = await this.requireConsultation(rawCode);
    const { count } = await this.prisma.kkiruConsultationRecord.updateMany({
      data: { content: input.content, recordedOn: toDateOnly(input.recordedOn) },
      where: { consultationId: consultation.id, id: recordId },
    });

    if (count === 0) {
      throw new NotFoundException('Record not found');
    }

    return this.findByCode(consultation.code);
  }

  /** 상담매물 기록에 매물을 더한다. 계약완료된 매물은 더할 수 없다. */
  async addListing(rawCode: string, listingId: string): Promise<ConsultationDetail> {
    const consultation = await this.requireConsultation(rawCode);
    const listing = await this.prisma.kkiruListing.findUnique({
      select: { status: true },
      where: { id: listingId },
    });

    if (!listing) {
      throw new BadRequestException('Unknown listing');
    }

    if (listing.status === 'contracted') {
      throw new ConflictException('Listing is already contracted');
    }

    try {
      await this.prisma.kkiruConsultationListing.create({
        data: { consultationId: consultation.id, listingId },
      });
    } catch (error) {
      // 이미 더한 매물이면 그대로 둔다.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
        throw error;
      }
    }

    return this.findByCode(consultation.code);
  }

  /** 잘못 더한 상담매물을 뺀다. 상담과 매물의 연결만 끊고 매물은 그대로 둔다. */
  async removeListing(rawCode: string, listingId: string): Promise<ConsultationDetail> {
    const consultation = await this.requireConsultation(rawCode);
    const { count } = await this.prisma.kkiruConsultationListing.deleteMany({
      where: { consultationId: consultation.id, listingId },
    });

    if (count === 0) {
      throw new NotFoundException('Listing is not in this consultation');
    }

    return this.findByCode(consultation.code);
  }

  private async requireConsultation(rawCode: string): Promise<{ id: string; code: string }> {
    const code = normalizeRandomCode(rawCode);
    const consultation = code
      ? await this.prisma.kkiruConsultation.findUnique({
          select: { code: true, id: true },
          where: { code },
        })
      : null;

    if (!consultation) {
      throw consultationNotFound();
    }

    return consultation;
  }
}
