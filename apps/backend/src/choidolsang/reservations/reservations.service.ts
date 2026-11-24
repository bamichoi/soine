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
import { generateInquiryCode, normalizeInquiryCode } from '../inquiries/inquiry-code';
import {
  type CreateReservationDto,
  DEFAULT_DEPOSIT_AMOUNT,
  type ListReservationsQueryDto,
} from './dto/create-reservation.dto';

export const RESERVATION_PAGE_SIZE = 20;
const CODE_GENERATION_ATTEMPTS = 5;

/** 예약을 만들 수 있는 문의 상태. 예약확정·취소된 문의는 이미 예약이 있다. */
const RESERVABLE_INQUIRY_STATUSES = new Set(['pending', 'rejected']);

export type ReservationConceptRef = { id: string; name: string; isDeleted: boolean };

export type Reservation = {
  id: string;
  /** 예약 번호 */
  code: string;
  /** 예약을 만든 문의의 문의 번호 */
  inquiryCode: string;
  customerName: string;
  eventAt: string;
  eventLocation: string;
  babyName: string | null;
  babyGender: ChoidolsangBabyGender | null;
  concept: ReservationConceptRef;
  guestCount: number | null;
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
function toReservationData(input: CreateReservationDto, depositAmount: number) {
  return {
    babyGender: input.babyGender ?? null,
    babyName: input.babyName ?? null,
    confirmedOn: new Date(`${input.confirmedOn}T00:00:00.000Z`),
    customerName: input.customerName,
    depositAmount,
    eventAt: new Date(input.eventAt),
    eventLocation: input.eventLocation,
    extraComponents: input.extraComponents ?? [],
    guestCount: input.guestCount ?? null,
    hasSnap: input.hasSnap ?? false,
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

@Injectable()
export class ChoidolsangReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ page = 1 }: ListReservationsQueryDto = {}): Promise<ReservationListResponse> {
    const [total, reservations] = await this.prisma.$transaction([
      this.prisma.choidolsangReservation.count(),
      this.prisma.choidolsangReservation.findMany({
        include: RESERVATION_INCLUDE,
        // 행사 날짜가 늦은 것부터. 같은 시각이면 최근 예약부터.
        orderBy: [{ eventAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * RESERVATION_PAGE_SIZE,
        take: RESERVATION_PAGE_SIZE,
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

    // 예약 번호가 우연히 겹치면(32^8분의 1) 새 번호로 트랜잭션을 다시 시도한다.
    for (let attempt = 1; ; attempt += 1) {
      try {
        return this.findByCode(await this.createFromInquiry(inquiryCode, input.conceptId, data));
      } catch (error) {
        if (isUniqueViolation(error, 'inquiryId')) {
          throw new ConflictException('Inquiry already has a reservation');
        }

        if (!isUniqueViolation(error, 'code') || attempt >= CODE_GENERATION_ATTEMPTS) {
          throw error;
        }
      }
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
        data: { ...data, code: generateInquiryCode(), conceptId, inquiryId: inquiry.id },
      });
      await tx.choidolsangInquiry.update({
        data: { rejectionReason: null, status: 'confirmed' },
        where: { id: inquiry.id },
      });

      return reservation.code;
    });
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
      select: { id: true, status: true },
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
