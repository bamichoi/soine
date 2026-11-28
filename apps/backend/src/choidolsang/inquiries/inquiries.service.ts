import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type ChoidolsangConcept,
  type ChoidolsangInquiry,
  type ChoidolsangInquiryRecord,
  type ChoidolsangInquiryStatus,
  Prisma,
} from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateInquiryDto, InquiryOptionalFieldsDto } from './dto/create-inquiry.dto';
import type { InquiryRecordDto } from './dto/inquiry-record.dto';
import type {
  InquirySearchField,
  InquirySortField,
  ListInquiriesQueryDto,
  SortOrder,
} from './dto/list-inquiries-query.dto';
import type { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { generateInquiryCode, normalizeInquiryCode } from './inquiry-code';

export const INQUIRY_PAGE_SIZE = 20;
const CODE_GENERATION_ATTEMPTS = 5;

/** 문의가 참조하는 돌상 컨셉 */
export type InquiryConceptRef = {
  id: string;
  name: string;
  isDeleted: boolean;
};

export type InquiryListItem = {
  id: string;
  /** 문의 번호 (무작위 코드) */
  code: string;
  /** 문의 날짜 (YYYY-MM-DD) */
  inquiredOn: string;
  /** 첫 문의 내용 (로그 첫 기록) */
  content: string;
  /** 희망 예약 일시 (ISO 8601), 없으면 null */
  desiredReservationAt: string | null;
  location: string | null;
  /** 희망 돌상 컨셉. 숨김 삭제된 컨셉이면 isDeleted가 true */
  desiredConcept: InquiryConceptRef | null;
  status: ChoidolsangInquiryStatus;
};

/** 문의 내용 로그의 기록 하나. 첫 기록이 첫 문의다. */
export type InquiryRecord = {
  id: string;
  /** 기록 날짜 (YYYY-MM-DD) */
  recordedOn: string;
  content: string;
  createdAt: string;
};

export type InquiryDetail = InquiryListItem & {
  /** 문의 내용 로그. 기록 날짜, 등록 순으로 오래된 것부터. */
  records: InquiryRecord[];
  /** 거절 사유. 거절 상태일 때만 값이 있다. */
  rejectionReason: string | null;
  /** 이 문의로 만든 예약의 예약 번호. 없으면 null */
  reservationCode: string | null;
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

function buildFieldCondition(field: Exclude<InquirySearchField, 'all'>, query: string) {
  switch (field) {
    case 'code': {
      const code = normalizeInquiryCode(query.replace(/^#/, ''));
      return code === null ? null : ({ code: { contains: code } } satisfies InquiryWhere);
    }
    case 'content':
      // 문의 내용은 로그의 모든 기록에서 찾는다.
      return {
        records: { some: { content: { contains: query, mode: 'insensitive' } } },
      } satisfies InquiryWhere;
    case 'desiredConcept':
      // 희망 컨셉은 참조한 컨셉 이름에서 찾는다.
      return {
        desiredConcept: { is: { name: { contains: query, mode: 'insensitive' } } },
      } satisfies InquiryWhere;
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

  const conditions = (['code', 'content', 'location', 'desiredConcept'] as const)
    .map((searchField) => buildFieldCondition(searchField, query))
    .filter((condition): condition is NonNullable<typeof condition> => condition !== null);

  // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
  return { OR: conditions };
}

const NULLABLE_SORT_FIELDS = new Set<InquirySortField>(['desiredReservationAt', 'location']);

function buildPrimaryOrderBy(sort: InquirySortField, order: SortOrder): InquiryOrderBy {
  if (sort === 'desiredConcept') {
    // 희망 컨셉은 컨셉 이름순. 컨셉이 없는 문의는 오름차순에서 뒤, 내림차순에서 앞에 온다.
    return { desiredConcept: { name: order } };
  }

  return NULLABLE_SORT_FIELDS.has(sort)
    ? { [sort]: { nulls: 'last', sort: order } }
    : { [sort]: order };
}

export function buildInquiryOrderBy(sort: InquirySortField, order: SortOrder): InquiryOrderBy[] {
  const primary = buildPrimaryOrderBy(sort, order);

  // 같은 값끼리는 최근에 등록한 문의가 먼저 오도록 한다.
  return [primary, { createdAt: 'desc' }];
}

// 로그는 기록 날짜, 같은 날짜면 등록 순으로 오래된 것부터 쌓는다. 첫 기록이 첫 문의다.
const RECORD_ORDER = [
  { recordedOn: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.ChoidolsangInquiryRecordOrderByWithRelationInput[];

type InquiryWithRecords = ChoidolsangInquiry & {
  records: ChoidolsangInquiryRecord[];
  desiredConcept: ChoidolsangConcept | null;
  /** 상세에서만 싣는다. */
  reservation?: { code: string } | null;
};

function toConceptRef(concept: ChoidolsangConcept | null): InquiryConceptRef | null {
  return concept
    ? { id: concept.id, isDeleted: concept.deletedAt !== null, name: concept.name }
    : null;
}

// DATE 컬럼은 UTC 자정으로 읽히므로 날짜 부분만 쓴다.
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// 날짜만 저장하는 DATE 컬럼은 UTC 자정으로 넣어 그대로 들어가게 한다.
function toDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toListItem(inquiry: InquiryWithRecords): InquiryListItem {
  return {
    code: inquiry.code,
    content: inquiry.records[0]?.content ?? '',
    desiredConcept: toConceptRef(inquiry.desiredConcept),
    desiredReservationAt: inquiry.desiredReservationAt?.toISOString() ?? null,
    id: inquiry.id,
    inquiredOn: toDateString(inquiry.inquiredOn),
    location: inquiry.location,
    status: inquiry.status,
  };
}

function toRecord(record: ChoidolsangInquiryRecord): InquiryRecord {
  return {
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    recordedOn: toDateString(record.recordedOn),
  };
}

function toDetail(inquiry: InquiryWithRecords): InquiryDetail {
  return {
    ...toListItem(inquiry),
    createdAt: inquiry.createdAt.toISOString(),
    records: inquiry.records.map(toRecord),
    rejectionReason: inquiry.rejectionReason,
    reservationCode: inquiry.reservation?.code ?? null,
    updatedAt: inquiry.updatedAt.toISOString(),
  };
}

// 상세에는 문의 내용 로그 전체와 희망 컨셉을 함께 싣는다.
const INQUIRY_INCLUDE = {
  desiredConcept: true,
  records: { orderBy: RECORD_ORDER },
  reservation: { select: { code: true } },
} satisfies Prisma.ChoidolsangInquiryInclude;

// 숨김 삭제한 문의는 어디서도 보이지 않는다.
const NOT_DELETED = { deletedAt: null } satisfies InquiryWhere;

function toOptionalFieldData(input: InquiryOptionalFieldsDto) {
  return {
    desiredConceptId: input.desiredConceptId ?? null,
    desiredReservationAt: input.desiredReservationAt ? new Date(input.desiredReservationAt) : null,
    location: input.location ?? null,
  };
}

function inquiryNotFound() {
  return new NotFoundException('Inquiry not found');
}

function recordNotFound() {
  return new NotFoundException('Inquiry record not found');
}

function isUniqueCodeViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes('code')
  );
}

type Transaction = Prisma.TransactionClient;

@Injectable()
export class ChoidolsangInquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    q = '',
    sort = 'inquiredOn',
    status,
  }: ListInquiriesQueryDto = {}): Promise<InquiryListResponse> {
    const where = {
      ...buildInquiryWhere(field, q),
      ...(status ? { status } : {}),
      ...NOT_DELETED,
    };
    const [total, inquiries] = await this.prisma.$transaction([
      this.prisma.choidolsangInquiry.count({ where }),
      this.prisma.choidolsangInquiry.findMany({
        // 목록의 문의 내용은 첫 기록(첫 문의)만 보여 준다.
        include: { desiredConcept: true, records: { orderBy: RECORD_ORDER, take: 1 } },
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
    const inquiry = code ? await this.findActive(code) : null;

    if (!inquiry) {
      throw inquiryNotFound();
    }

    return toDetail(inquiry);
  }

  /** 문의를 추가한다. 문의 내용은 로그의 첫 기록으로, 문의 날짜는 그 기록 날짜로 저장한다. */
  async create(input: CreateInquiryDto): Promise<InquiryDetail> {
    await this.assertSelectableConcept(input.desiredConceptId);
    const inquiredOn = toDateOnly(input.inquiredOn);
    const data = {
      ...toOptionalFieldData(input),
      inquiredOn,
      records: { create: [{ content: input.content, recordedOn: inquiredOn }] },
      rejectionReason: input.status === 'rejected' ? (input.rejectionReason ?? null) : null,
      status: input.status ?? 'pending',
    };

    // 코드가 우연히 겹치면(32^8분의 1) 새 코드로 다시 시도한다.
    for (let attempt = 1; ; attempt += 1) {
      try {
        const inquiry = await this.prisma.choidolsangInquiry.create({
          data: { ...data, code: generateInquiryCode() },
          include: INQUIRY_INCLUDE,
        });

        return toDetail(inquiry);
      } catch (error) {
        if (!isUniqueCodeViolation(error) || attempt >= CODE_GENERATION_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  /**
   * 문의의 선택 항목(희망 예약일시·장소·컨셉)을 고친다. 상태와 문의 내용 로그는 바꾸지 않는다.
   * 거절 사유는 거절된 문의일 때만 고치며, 보내지 않으면 그대로 둔다.
   */
  async update(rawCode: string, input: UpdateInquiryDto): Promise<InquiryDetail> {
    const { code, inquiry } = await this.requireActive(rawCode);

    // 이미 고른 컨셉은 그사이 숨김 삭제됐어도 그대로 둘 수 있다.
    if (input.desiredConceptId !== inquiry.desiredConceptId) {
      await this.assertSelectableConcept(input.desiredConceptId);
    }

    const data = {
      ...toOptionalFieldData(input),
      ...(inquiry.status === 'rejected' && input.rejectionReason
        ? { rejectionReason: input.rejectionReason }
        : {}),
    };

    // 읽은 뒤 상태가 바뀌었다면(예: 그사이 거절) 덮어쓰지 않도록 읽은 상태를 조건으로 건다.
    const { count } = await this.prisma.choidolsangInquiry.updateMany({
      data,
      where: { code, status: inquiry.status, ...NOT_DELETED },
    });

    if (count === 0) {
      throw new ConflictException('Inquiry changed while editing');
    }

    return this.findByCode(code);
  }

  /** 문의 내용 로그에 기록을 덧붙인다. */
  addRecord(rawCode: string, input: InquiryRecordDto): Promise<InquiryDetail> {
    return this.changeRecords(rawCode, async (tx, inquiryId) => {
      await tx.choidolsangInquiryRecord.create({
        data: { content: input.content, inquiryId, recordedOn: toDateOnly(input.recordedOn) },
      });
    });
  }

  /** 기록 하나를 고친다. 다른 문의의 기록은 고칠 수 없다. */
  updateRecord(rawCode: string, recordId: string, input: InquiryRecordDto): Promise<InquiryDetail> {
    return this.changeRecords(rawCode, async (tx, inquiryId) => {
      const { count } = await tx.choidolsangInquiryRecord.updateMany({
        data: { content: input.content, recordedOn: toDateOnly(input.recordedOn) },
        where: { id: recordId, inquiryId },
      });

      if (count === 0) {
        throw recordNotFound();
      }
    });
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
      throw inquiryNotFound();
    }

    const { count } = await this.prisma.choidolsangInquiry.updateMany({
      data,
      where: { code, status: from, ...NOT_DELETED },
    });
    const inquiry = await this.findActive(code);

    if (!inquiry) {
      throw inquiryNotFound();
    }

    if (count === 0) {
      throw new ConflictException(`Inquiry status must be ${from} but is ${inquiry.status}`);
    }

    return toDetail(inquiry);
  }

  /**
   * 기록을 바꾸고 문의 날짜를 첫 기록 날짜에 맞춘다.
   * 같은 문의의 기록 변경이 겹치지 않도록 문의 행을 잠근 채 한 트랜잭션으로 처리한다.
   */
  private async changeRecords(
    rawCode: string,
    change: (tx: Transaction, inquiryId: string) => Promise<void>,
  ): Promise<InquiryDetail> {
    const { code, inquiry } = await this.requireActive(rawCode);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "choidolsang"."inquiries" WHERE "id" = ${inquiry.id}::uuid FOR UPDATE`;
      await change(tx, inquiry.id);

      const first = await tx.choidolsangInquiryRecord.findFirst({
        orderBy: RECORD_ORDER,
        where: { inquiryId: inquiry.id },
      });

      if (first) {
        await tx.choidolsangInquiry.update({
          data: { inquiredOn: first.recordedOn },
          where: { id: inquiry.id },
        });
      }
    });

    return this.findByCode(code);
  }

  /** 새로 고르는 희망 컨셉은 있고 숨김 삭제되지 않은 것이어야 한다. */
  private async assertSelectableConcept(conceptId: string | null | undefined): Promise<void> {
    if (!conceptId) {
      return;
    }

    const concept = await this.prisma.choidolsangConcept.findFirst({
      select: { id: true },
      where: { deletedAt: null, id: conceptId },
    });

    if (!concept) {
      throw new BadRequestException('Unknown concept');
    }
  }

  private async requireActive(rawCode: string) {
    const code = normalizeInquiryCode(rawCode);
    const inquiry = code ? await this.findActive(code) : null;

    if (!(code && inquiry)) {
      throw inquiryNotFound();
    }

    return { code, inquiry };
  }

  private findActive(code: string) {
    return this.prisma.choidolsangInquiry.findFirst({
      include: INQUIRY_INCLUDE,
      where: { code, ...NOT_DELETED },
    });
  }
}
