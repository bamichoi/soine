import { Injectable } from '@nestjs/common';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { SalesItemsQueryDto, SalesPeriodQueryDto } from './dto/sales-query.dto';
import {
  monthPeriod,
  monthRange,
  previousPeriod,
  type SalesPeriod,
  toSeoulMonthKey,
  trendMonths,
  yearPeriod,
} from './sales-period';

export const SALES_PAGE_SIZE = 20;

export type SalesSummary = {
  period: { kind: 'month' | 'year'; key: string };
  /** 업무 완료된 예약의 최종 결제 금액 합계 */
  totalAmount: number;
  count: number;
  /** 건당 평균 (원, 반올림). 건수가 0이면 0 */
  averageAmount: number;
  /** 바로 앞 기간(지난달·지난해) 합계 */
  previousTotalAmount: number;
  /** 앞 기간 대비 증감률(%). 앞 기간 매출이 0이면 null */
  changeRate: number | null;
  /** 예정 매출: 이 기간에 행사가 있는 예약중 예약 */
  expected: { totalAmount: number; count: number };
  /** 12개 달의 매출 (월 보기: 최근 12개월, 연 보기: 그해 1~12월) */
  trend: { month: string; totalAmount: number; count: number }[];
  /** 돌상 컨셉별 매출, 많은 순 */
  byConcept: {
    conceptId: string;
    name: string;
    isDeleted: boolean;
    count: number;
    totalAmount: number;
    /** 이 기간 매출에서 차지하는 비중(%, 소수 첫째 자리) */
    share: number;
  }[];
};

export type SalesItem = {
  code: string;
  completedAt: string;
  eventAt: string;
  customerName: string;
  conceptName: string;
  totalAmount: number;
};

export type SalesItemsResponse = {
  items: SalesItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

/** 매출은 업무 완료된 예약만, 완료를 누른 시각 기준으로 센다. 취소환불은 아직 넣지 않는다. */
function completedIn({ start, end }: { start: Date; end: Date }) {
  return { completedAt: { gte: start, lt: end }, status: 'completed' as const };
}

export function toPeriod(query: SalesPeriodQueryDto): SalesPeriod {
  if (query.month) {
    return monthPeriod(query.month);
  }

  return yearPeriod(query.year as number);
}

function roundShare(value: number): number {
  return Math.round(value * 10) / 10;
}

@Injectable()
export class ChoidolsangSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(query: SalesPeriodQueryDto): Promise<SalesSummary> {
    const period = toPeriod(query);
    const months = trendMonths(period);
    const reservation = this.prisma.choidolsangReservation;

    const [current, previous, expected, trendRows, conceptRows] = await this.prisma.$transaction([
      reservation.aggregate({
        _count: true,
        _sum: { totalAmount: true },
        where: completedIn(period),
      }),
      reservation.aggregate({
        _sum: { totalAmount: true },
        where: completedIn(previousPeriod(period)),
      }),
      reservation.aggregate({
        _count: true,
        _sum: { totalAmount: true },
        where: { eventAt: { gte: period.start, lt: period.end }, status: 'reserved' },
      }),
      reservation.findMany({
        select: { completedAt: true, totalAmount: true },
        where: completedIn(monthRange(months)),
      }),
      reservation.findMany({
        select: {
          concept: { select: { deletedAt: true, id: true, name: true } },
          totalAmount: true,
        },
        where: completedIn(period),
      }),
    ]);

    const totalAmount = current._sum.totalAmount ?? 0;
    const count = current._count;
    const previousTotalAmount = previous._sum.totalAmount ?? 0;

    return {
      averageAmount: count > 0 ? Math.round(totalAmount / count) : 0,
      byConcept: this.groupByConcept(conceptRows, totalAmount),
      changeRate:
        previousTotalAmount > 0
          ? roundShare(((totalAmount - previousTotalAmount) / previousTotalAmount) * 100)
          : null,
      count,
      expected: { count: expected._count, totalAmount: expected._sum.totalAmount ?? 0 },
      period: { key: period.key, kind: period.kind },
      previousTotalAmount,
      totalAmount,
      trend: this.groupByMonth(trendRows, months),
    };
  }

  async items(query: SalesItemsQueryDto): Promise<SalesItemsResponse> {
    const period = toPeriod(query);
    const page = query.page ?? 1;
    const where = completedIn(period);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.choidolsangReservation.count({ where }),
      this.prisma.choidolsangReservation.findMany({
        orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          code: true,
          completedAt: true,
          concept: { select: { name: true } },
          customerName: true,
          eventAt: true,
          totalAmount: true,
        },
        skip: (page - 1) * SALES_PAGE_SIZE,
        take: SALES_PAGE_SIZE,
        where,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        code: row.code,
        completedAt: (row.completedAt as Date).toISOString(),
        conceptName: row.concept.name,
        customerName: row.customerName,
        eventAt: row.eventAt.toISOString(),
        totalAmount: row.totalAmount,
      })),
      pagination: {
        page,
        pageSize: SALES_PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / SALES_PAGE_SIZE)),
      },
    };
  }

  private groupByMonth(
    rows: { completedAt: Date | null; totalAmount: number }[],
    months: string[],
  ): SalesSummary['trend'] {
    const byMonth = new Map(months.map((month) => [month, { count: 0, totalAmount: 0 }]));

    for (const row of rows) {
      const bucket = row.completedAt ? byMonth.get(toSeoulMonthKey(row.completedAt)) : undefined;

      if (bucket) {
        bucket.count += 1;
        bucket.totalAmount += row.totalAmount;
      }
    }

    return months.map((month) => ({
      month,
      ...(byMonth.get(month) as { count: number; totalAmount: number }),
    }));
  }

  private groupByConcept(
    rows: { concept: { id: string; name: string; deletedAt: Date | null }; totalAmount: number }[],
    totalAmount: number,
  ): SalesSummary['byConcept'] {
    const byConcept = new Map<string, SalesSummary['byConcept'][number]>();

    for (const { concept, totalAmount: amount } of rows) {
      const entry = byConcept.get(concept.id) ?? {
        conceptId: concept.id,
        count: 0,
        isDeleted: concept.deletedAt !== null,
        name: concept.name,
        share: 0,
        totalAmount: 0,
      };
      entry.count += 1;
      entry.totalAmount += amount;
      byConcept.set(concept.id, entry);
    }

    return [...byConcept.values()]
      .map((entry) => ({
        ...entry,
        share: totalAmount > 0 ? roundShare((entry.totalAmount / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount || a.name.localeCompare(b.name, 'ko'));
  }
}
