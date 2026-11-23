import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type ChoidolsangInquiry,
  type ChoidolsangInquiryStatus,
  Prisma,
} from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateInquiryDto } from './dto/create-inquiry.dto';
import type {
  InquirySearchField,
  InquirySortField,
  ListInquiriesQueryDto,
  SortOrder,
} from './dto/list-inquiries-query.dto';
import { generateInquiryCode, normalizeInquiryCode } from './inquiry-code';

export const INQUIRY_PAGE_SIZE = 20;
const CODE_GENERATION_ATTEMPTS = 5;

const STATUS_LABELS: Record<ChoidolsangInquiryStatus, string> = {
  confirmed: '예약확정',
  pending: '대기',
  rejected: '거절',
};

export type InquiryListItem = {
  id: string;
  /** 문의 번호 (무작위 코드) */
  code: string;
  /** 문의 날짜 (YYYY-MM-DD) */
  inquiredOn: string;
  content: string;
  /** 희망 예약 일시 (ISO 8601), 없으면 null */
  desiredReservationAt: string | null;
  location: string | null;
  desiredConcept: string | null;
  status: ChoidolsangInquiryStatus;
};

export type InquiryDetail = InquiryListItem & {
  /** 거절 사유. 거절 상태일 때만 값이 있다. */
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InquiryListResponse = {
  items: InquiryListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type InquiryWhere = Prisma.ChoidolsangInquiryWhereInput;
type InquiryOrderBy = Prisma.ChoidolsangInquiryOrderByWithRelationInput;

// 상태는 화면 표시 이름(대기, 예약확정, 거절)이나 값(pending 등)의 일부로 찾는다.
function matchStatuses(query: string): ChoidolsangInquiryStatus[] {
  const lowerQuery = query.toLowerCase();

  return (Object.keys(STATUS_LABELS) as ChoidolsangInquiryStatus[]).filter(
    (status) => STATUS_LABELS[status].includes(query) || status.includes(lowerQuery),
  );
}

function buildFieldCondition(field: Exclude<InquirySearchField, 'all'>, query: string) {
  switch (field) {
    case 'code': {
      const code = normalizeInquiryCode(query.replace(/^#/, ''));
      return code === null ? null : ({ code: { contains: code } } satisfies InquiryWhere);
    }
    case 'status':
      return { status: { in: matchStatuses(query) } } satisfies InquiryWhere;
    default:
      return { [field]: { contains: query, mode: 'insensitive' } } satisfies InquiryWhere;
  }
}

export function buildInquiryWhere(field: InquirySearchField, query: string): InquiryWhere {
  if (!query) {
    return {};
  }

  if (field !== 'all') {
    // 조건을 만들 수 없는 검색어(예: 형식이 맞지 않는 문의 번호)는 결과 없음으로 처리한다.
    return buildFieldCondition(field, query) ?? { id: { in: [] } };
  }

  const conditions = (['code', 'content', 'location', 'desiredConcept', 'status'] as const)
    .map((searchField) => buildFieldCondition(searchField, query))
    .filter((condition): condition is NonNullable<typeof condition> => condition !== null);

  // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
  return { OR: conditions };
}

const NULLABLE_SORT_FIELDS = new Set<InquirySortField>([
  'desiredReservationAt',
  'location',
  'desiredConcept',
]);

export function buildInquiryOrderBy(sort: InquirySortField, order: SortOrder): InquiryOrderBy[] {
  const primary: InquiryOrderBy = NULLABLE_SORT_FIELDS.has(sort)
    ? { [sort]: { nulls: 'last', sort: order } }
    : { [sort]: order };

  // 같은 값끼리는 최근에 등록한 문의가 먼저 오도록 한다.
  return [primary, { createdAt: 'desc' }];
}

function toListItem(inquiry: ChoidolsangInquiry): InquiryListItem {
  return {
    code: inquiry.code,
    content: inquiry.content,
    desiredConcept: inquiry.desiredConcept,
    desiredReservationAt: inquiry.desiredReservationAt?.toISOString() ?? null,
    id: inquiry.id,
    // DATE 컬럼은 UTC 자정으로 읽히므로 날짜 부분만 쓴다.
    inquiredOn: inquiry.inquiredOn.toISOString().slice(0, 10),
    location: inquiry.location,
    status: inquiry.status,
  };
}

function toDetail(inquiry: ChoidolsangInquiry): InquiryDetail {
  return {
    ...toListItem(inquiry),
    createdAt: inquiry.createdAt.toISOString(),
    rejectionReason: inquiry.rejectionReason,
    updatedAt: inquiry.updatedAt.toISOString(),
  };
}

function isUniqueCodeViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes('code')
  );
}

@Injectable()
export class ChoidolsangInquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    q = '',
    sort = 'inquiredOn',
  }: ListInquiriesQueryDto = {}): Promise<InquiryListResponse> {
    const where = buildInquiryWhere(field, q);
    const [total, inquiries] = await this.prisma.$transaction([
      this.prisma.choidolsangInquiry.count({ where }),
      this.prisma.choidolsangInquiry.findMany({
        orderBy: buildInquiryOrderBy(sort, order),
        skip: (page - 1) * INQUIRY_PAGE_SIZE,
        take: INQUIRY_PAGE_SIZE,
        where,
      }),
    ]);

    return {
      items: inquiries.map(toListItem),
      pagination: {
        page,
        pageSize: INQUIRY_PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / INQUIRY_PAGE_SIZE)),
      },
    };
  }

  async findByCode(rawCode: string): Promise<InquiryDetail> {
    const code = normalizeInquiryCode(rawCode);
    const inquiry = code
      ? await this.prisma.choidolsangInquiry.findUnique({ where: { code } })
      : null;

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    return toDetail(inquiry);
  }

  async create(input: CreateInquiryDto): Promise<InquiryDetail> {
    const data = {
      content: input.content,
      desiredConcept: input.desiredConcept ?? null,
      desiredReservationAt: input.desiredReservationAt
        ? new Date(input.desiredReservationAt)
        : null,
      // 문의 날짜는 날짜만 저장한다. UTC 자정으로 넣어 DATE 컬럼에 그대로 들어가게 한다.
      inquiredOn: new Date(`${input.inquiredOn}T00:00:00.000Z`),
      location: input.location ?? null,
      rejectionReason: input.status === 'rejected' ? (input.rejectionReason ?? null) : null,
      status: input.status ?? 'pending',
    };

    // 코드가 우연히 겹치면(32^8분의 1) 새 코드로 다시 시도한다.
    for (let attempt = 1; ; attempt += 1) {
      try {
        const inquiry = await this.prisma.choidolsangInquiry.create({
          data: { ...data, code: generateInquiryCode() },
        });

        return toDetail(inquiry);
      } catch (error) {
        if (!isUniqueCodeViolation(error) || attempt >= CODE_GENERATION_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  /** 대기 중인 문의를 거절한다. 거절 사유는 필수. */
  reject(rawCode: string, reason: string): Promise<InquiryDetail> {
    return this.changeStatus(rawCode, 'pending', { rejectionReason: reason, status: 'rejected' });
  }

  /** 거절한 문의를 다시 대기로 돌린다. 거절 사유는 지운다. */
  reopen(rawCode: string): Promise<InquiryDetail> {
    return this.changeStatus(rawCode, 'rejected', { rejectionReason: null, status: 'pending' });
  }

  // 현재 상태가 from일 때만 바꾼다. 동시에 두 사람이 눌러도 한 번만 반영되도록 조건부로 갱신한다.
  private async changeStatus(
    rawCode: string,
    from: ChoidolsangInquiryStatus,
    data: { status: ChoidolsangInquiryStatus; rejectionReason: string | null },
  ): Promise<InquiryDetail> {
    const code = normalizeInquiryCode(rawCode);

    if (!code) {
      throw new NotFoundException('Inquiry not found');
    }

    const { count } = await this.prisma.choidolsangInquiry.updateMany({
      data,
      where: { code, status: from },
    });
    const inquiry = await this.prisma.choidolsangInquiry.findUnique({ where: { code } });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    if (count === 0) {
      throw new ConflictException(`Inquiry status must be ${from} but is ${inquiry.status}`);
    }

    return toDetail(inquiry);
  }
}
