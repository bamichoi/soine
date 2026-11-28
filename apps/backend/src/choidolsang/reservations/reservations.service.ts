import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type ChoidolsangBabyGender,
  type ChoidolsangConcept,
  type ChoidolsangReservation,
  type ChoidolsangReservationStatus,
  Prisma,
} from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeInquiryCode } from '../inquiries/inquiry-code';
import {
  type CreateReservationDto,
  DEFAULT_DEPOSIT_AMOUNT,
  type ListReservationsQueryDto,
  type ReservationCalendarQueryDto,
  type ReservationFieldsDto,
  type ReservationSearchField,
  type ReservationSortField,
  type ReservationSortOrder,
  type UpdateReservationDto,
} from './dto/create-reservation.dto';

export const RESERVATION_PAGE_SIZE = 20;

/** 예약을 만들 수 있는 문의 상태. 예약확정·취소된 문의는 이미 예약이 있다. */
const RESERVABLE_INQUIRY_STATUSES = new Set(['pending', 'rejected']);

export type ReservationConceptRef = { id: string; name: string; isDeleted: boolean };

export type Reservation = {
  id: string;
  /** 예약 번호. 예약을 만든 문의의 문의 번호와 같다. */
  code: string;
  /** 예약을 만든 문의의 문의 번호 */
  inquiryCode: string;
  customerName: string;
  /** 예약자 연락처 (숫자만) */
  customerPhone: string;
  eventAt: string;
  eventLocation: string;
  babyName: string;
  babyGender: ChoidolsangBabyGender;
  concept: ReservationConceptRef;
  guestCount: number;
  hasSnap: boolean;
  requests: string | null;
  extraComponents: string[];
  totalAmount: number;
  depositAmount: number;
  /** 잔금 = 최종 결제 금액 - 예약금 */
  balanceAmount: number;
  /** 예약 확정 날짜 (YYYY-MM-DD) */
  confirmedOn: string;
  status: ChoidolsangReservationStatus;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 달력 칸에 표시할 짧은 예약 정보 */
export type ReservationCalendarItem = {
  code: string;
  eventAt: string;
  customerName: string;
  eventLocation: string;
  conceptName: string;
  status: ChoidolsangReservationStatus;
};

/** 달력 조회 기간 최대 길이. 6주짜리 월 달력(42일)을 넉넉히 덮는다. */
export const CALENDAR_MAX_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ReservationListResponse = {
  items: Reservation[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type ReservationWithRelations = ChoidolsangReservation & {
  concept: ChoidolsangConcept;
  inquiry: { code: string };
};

const RESERVATION_INCLUDE = {
  concept: true,
  inquiry: { select: { code: true } },
} satisfies Prisma.ChoidolsangReservationInclude;

function toReservation(reservation: ReservationWithRelations): Reservation {
  return {
    babyGender: reservation.babyGender,
    babyName: reservation.babyName,
    balanceAmount: reservation.totalAmount - reservation.depositAmount,
    cancelledAt: reservation.cancelledAt?.toISOString() ?? null,
    code: reservation.code,
    completedAt: reservation.completedAt?.toISOString() ?? null,
    concept: {
      id: reservation.concept.id,
      isDeleted: reservation.concept.deletedAt !== null,
      name: reservation.concept.name,
    },
    confirmedOn: reservation.confirmedOn.toISOString().slice(0, 10),
    createdAt: reservation.createdAt.toISOString(),
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    depositAmount: reservation.depositAmount,
    eventAt: reservation.eventAt.toISOString(),
    eventLocation: reservation.eventLocation,
    extraComponents: reservation.extraComponents,
    guestCount: reservation.guestCount,
    hasSnap: reservation.hasSnap,
    id: reservation.id,
    inquiryCode: reservation.inquiry.code,
    requests: reservation.requests,
    status: reservation.status,
    totalAmount: reservation.totalAmount,
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

// 입력을 저장할 값으로 바꾼다. 비운 선택 항목은 null, 날짜만 받는 값은 UTC 자정으로 넣는다.
function toReservationData(input: ReservationFieldsDto, depositAmount: number) {
  return {
    babyGender: input.babyGender,
    babyName: input.babyName,
    confirmedOn: new Date(`${input.confirmedOn}T00:00:00.000Z`),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    depositAmount,
    eventAt: new Date(input.eventAt),
    eventLocation: input.eventLocation,
    extraComponents: input.extraComponents ?? [],
    guestCount: input.guestCount,
    hasSnap: input.hasSnap,
    requests: input.requests ?? null,
    totalAmount: input.totalAmount,
  };
}

function reservationNotFound() {
  return new NotFoundException('Reservation not found');
}

function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes(field)
  );
}

type ReservationWhere = Prisma.ChoidolsangReservationWhereInput;

/**
 * 예약 번호·예약자·연락처·아기 이름·돌상 컨셉·행사 장소로 찾는다. field로 한 항목만 고를 수 있다.
 * 조건을 만들 수 없는 검색어(예: 번호 형식이 아님)로 한 항목을 고르면 결과가 없다.
 */
export function buildReservationWhere(
  field: ReservationSearchField,
  query: string,
): ReservationWhere {
  if (!query) {
    return {};
  }

  const contains = { contains: query, mode: 'insensitive' as const };
  const code = normalizeInquiryCode(query.replace(/^#/, ''));
  const digits = query.replace(/\D/g, '');
  const conditions: Record<Exclude<ReservationSearchField, 'all'>, ReservationWhere | null> = {
    babyName: { babyName: contains },
    code: code ? { code: { contains: code } } : null,
    concept: { concept: { name: contains } },
    customerName: { customerName: contains },
    customerPhone: digits.length >= 3 ? { customerPhone: { contains: digits } } : null,
    eventLocation: { eventLocation: contains },
  };

  if (field !== 'all') {
    return conditions[field] ?? { id: { in: [] } };
  }

  // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
  return { OR: Object.values(conditions).filter((condition) => condition !== null) };
}

const RESERVATION_ORDER_BY: Record<
  ReservationSortField,
  (order: ReservationSortOrder) => Prisma.ChoidolsangReservationOrderByWithRelationInput
> = {
  babyName: (order) => ({ babyName: order }),
  concept: (order) => ({ concept: { name: order } }),
  customerName: (order) => ({ customerName: order }),
  eventAt: (order) => ({ eventAt: order }),
  status: (order) => ({ status: order }),
  totalAmount: (order) => ({ totalAmount: order }),
};

@Injectable()
export class ChoidolsangReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    q = '',
    sort = 'eventAt',
    status,
  }: ListReservationsQueryDto = {}): Promise<ReservationListResponse> {
    const where = { ...buildReservationWhere(field, q), ...(status ? { status } : {}) };
    const [total, reservations] = await this.prisma.$transaction([
      this.prisma.choidolsangReservation.count({ where }),
      this.prisma.choidolsangReservation.findMany({
        include: RESERVATION_INCLUDE,
        // 기본은 행사 날짜가 늦은 것부터. 같은 값끼리는 행사가 늦은 것, 최근 예약 순.
        orderBy: [RESERVATION_ORDER_BY[sort](order), { eventAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * RESERVATION_PAGE_SIZE,
        take: RESERVATION_PAGE_SIZE,
        where,
      }),
    ]);

    return {
      items: reservations.map(toReservation),
      pagination: {
        page,
        pageSize: RESERVATION_PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / RESERVATION_PAGE_SIZE)),
      },
    };
  }

  /**
   * 달력에 표시할 예약. 기간은 한국 날짜 기준 [from, to)이며, 취소환불된 예약은 빼고
   * 예약중·완료 예약만 행사 시각 순으로 돌려준다.
   */
  async listForCalendar({
    from,
    to,
  }: ReservationCalendarQueryDto): Promise<ReservationCalendarItem[]> {
    const start = new Date(`${from}T00:00:00+09:00`);
    const end = new Date(`${to}T00:00:00+09:00`);
    const days = (end.getTime() - start.getTime()) / DAY_MS;

    if (days <= 0 || days > CALENDAR_MAX_DAYS) {
      throw new BadRequestException(`Range must be 1 to ${CALENDAR_MAX_DAYS} days`);
    }

    const reservations = await this.prisma.choidolsangReservation.findMany({
      orderBy: [{ eventAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        code: true,
        concept: { select: { name: true } },
        customerName: true,
        eventAt: true,
        eventLocation: true,
        status: true,
      },
      where: { eventAt: { gte: start, lt: end }, status: { in: ['reserved', 'completed'] } },
    });

    return reservations.map((reservation) => ({
      code: reservation.code,
      conceptName: reservation.concept.name,
      customerName: reservation.customerName,
      eventAt: reservation.eventAt.toISOString(),
      eventLocation: reservation.eventLocation,
      status: reservation.status,
    }));
  }

  async findByCode(rawCode: string): Promise<Reservation> {
    const code = normalizeInquiryCode(rawCode);
    const reservation = code
      ? await this.prisma.choidolsangReservation.findUnique({
          include: RESERVATION_INCLUDE,
          where: { code },
        })
      : null;

    if (!reservation) {
      throw reservationNotFound();
    }

    return toReservation(reservation);
  }

  /**
   * 문의에서 예약을 만들고 문의를 예약확정으로 바꾼다. 한 트랜잭션에서 문의 행을 잠그고 처리해
   * 같은 문의로 예약이 두 번 만들어지지 않게 한다.
   */
  async create(input: CreateReservationDto): Promise<Reservation> {
    const inquiryCode = normalizeInquiryCode(input.inquiryCode);
    const depositAmount = input.depositAmount ?? DEFAULT_DEPOSIT_AMOUNT;

    if (!inquiryCode) {
      throw new NotFoundException('Inquiry not found');
    }

    if (depositAmount > input.totalAmount) {
      throw new BadRequestException('depositAmount must not exceed totalAmount');
    }

    const data = toReservationData(input, depositAmount);

    try {
      return await this.findByCode(
        await this.createFromInquiry(inquiryCode, input.conceptId, data),
      );
    } catch (error) {
      // 같은 문의로 동시에 두 번 만들면 문의 ID·예약 번호(= 문의 번호) 유일 제약에 걸린다.
      if (isUniqueViolation(error, 'inquiryId') || isUniqueViolation(error, 'code')) {
        throw new ConflictException('Inquiry already has a reservation');
      }

      throw error;
    }
  }

  private createFromInquiry(
    inquiryCode: string,
    conceptId: string,
    data: ReturnType<typeof toReservationData>,
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const inquiry = await this.lockReservableInquiry(tx, inquiryCode);
      await this.assertSelectableConcept(tx, conceptId);

      const reservation = await tx.choidolsangReservation.create({
        // 예약 번호는 문의 번호와 같게 둔다. 문의 하나에 예약 하나라 겹치지 않는다.
        data: { ...data, code: inquiry.code, conceptId, inquiryId: inquiry.id },
      });
      await tx.choidolsangInquiry.update({
        data: { rejectionReason: null, status: 'confirmed' },
        where: { id: inquiry.id },
      });

      return reservation.code;
    });
  }

  /**
   * 예약중인 예약을 고친다. 완료·취소환불된 예약은 고칠 수 없다(409).
   * 돌상 컨셉은 새로 고를 때만 숨김 삭제되지 않은 것인지 확인한다(이미 고른 컨셉은 그대로 둘 수 있다).
   */
  async update(rawCode: string, input: UpdateReservationDto): Promise<Reservation> {
    const code = normalizeInquiryCode(rawCode);
    const depositAmount = input.depositAmount ?? DEFAULT_DEPOSIT_AMOUNT;

    if (!code) {
      throw reservationNotFound();
    }

    if (depositAmount > input.totalAmount) {
      throw new BadRequestException('depositAmount must not exceed totalAmount');
    }

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.choidolsangReservation.findUnique({
        select: { conceptId: true, status: true },
        where: { code },
      });

      if (!current) {
        throw reservationNotFound();
      }

      if (current.status !== 'reserved') {
        throw new ConflictException(`Reservation status must be reserved but is ${current.status}`);
      }

      if (input.conceptId !== current.conceptId) {
        await this.assertSelectableConcept(tx, input.conceptId);
      }

      // 읽은 뒤 그사이 취소·완료됐다면 덮어쓰지 않도록 상태를 조건으로 건다.
      const { count } = await tx.choidolsangReservation.updateMany({
        data: { ...toReservationData(input, depositAmount), conceptId: input.conceptId },
        where: { code, status: 'reserved' },
      });

      if (count === 0) {
        throw new ConflictException('Reservation changed while editing');
      }
    });

    return this.findByCode(code);
  }

  /** 예약중인 예약을 취소환불로 바꾸고, 이어진 문의를 취소로 바꾼다. */
  cancel(rawCode: string): Promise<Reservation> {
    return this.finish(rawCode, { cancelledAt: new Date(), status: 'cancelled' }, 'cancelled');
  }

  /** 예약중인 예약을 업무 완료로 바꾼다. 완료 시각은 나중에 매출 집계 기준이 된다. */
  complete(rawCode: string): Promise<Reservation> {
    return this.finish(rawCode, { completedAt: new Date(), status: 'completed' }, null);
  }

  // 예약중(reserved)일 때만 바꾼다. 동시에 눌러도 한 번만 반영되도록 조건부로 갱신한다.
  private async finish(
    rawCode: string,
    data: Prisma.ChoidolsangReservationUpdateManyMutationInput,
    inquiryStatus: 'cancelled' | null,
  ): Promise<Reservation> {
    const code = normalizeInquiryCode(rawCode);

    if (!code) {
      throw reservationNotFound();
    }

    await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.choidolsangReservation.findUnique({
        select: { inquiryId: true, status: true },
        where: { code },
      });

      if (!reservation) {
        throw reservationNotFound();
      }

      const { count } = await tx.choidolsangReservation.updateMany({
        data,
        where: { code, status: 'reserved' },
      });

      if (count === 0) {
        throw new ConflictException(
          `Reservation status must be reserved but is ${reservation.status}`,
        );
      }

      if (inquiryStatus) {
        await tx.choidolsangInquiry.update({
          data: { status: inquiryStatus },
          where: { id: reservation.inquiryId },
        });
      }
    });

    return this.findByCode(code);
  }

  private async lockReservableInquiry(tx: Prisma.TransactionClient, code: string) {
    const inquiry = await tx.choidolsangInquiry.findFirst({
      select: { id: true, status: true },
      where: { code, deletedAt: null },
    });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    await tx.$executeRaw`SELECT 1 FROM "choidolsang"."inquiries" WHERE "id" = ${inquiry.id}::uuid FOR UPDATE`;
    const locked = await tx.choidolsangInquiry.findUniqueOrThrow({
      select: { code: true, id: true, status: true },
      where: { id: inquiry.id },
    });

    if (!RESERVABLE_INQUIRY_STATUSES.has(locked.status)) {
      throw new ConflictException(`Inquiry status ${locked.status} cannot be reserved`);
    }

    return locked;
  }

  private async assertSelectableConcept(tx: Prisma.TransactionClient, conceptId: string) {
    const concept = await tx.choidolsangConcept.findFirst({
      select: { id: true },
      where: { deletedAt: null, id: conceptId },
    });

    if (!concept) {
      throw new BadRequestException('Unknown concept');
    }
  }
}
