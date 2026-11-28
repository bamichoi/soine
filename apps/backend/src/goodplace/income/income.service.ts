import { BadRequestException, Injectable } from '@nestjs/common';
import type { GoodplaceContractStatus } from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { toDateOnly, toDateString } from '../common/goodplace-fields';
import type { IncomeMineFilter, IncomeQueryDto } from './dto/income.dto';

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 수입에 넣는 계약 상태. 계약취소는 뺀다. */
const INCOME_CONTRACT_STATUSES: GoodplaceContractStatus[] = ['contracting', 'completed'];

/** 확정 = 계약완료이고 잔금일이 오늘(서울) 이전·당일, 예정 = 그 밖 */
export type IncomeState = 'confirmed' | 'expected';

export type IncomeContract = {
  id: string;
  caseCode: string;
  customer: { name: string };
  listing: { name: string };
  /** 계약일 (YYYY-MM-DD) */
  contractedOn: string;
  /** 잔금일 (YYYY-MM-DD) */
  balanceDueOn: string;
  /** 수수료(만원) */
  commission: number;
  status: GoodplaceContractStatus;
  isMyListing: boolean;
  isMyClient: boolean;
  incomeState: IncomeState;
};

export type IncomeMonth = {
  /** 1 ~ 12 */
  month: number;
  confirmedAmount: number;
  expectedAmount: number;
  count: number;
};

export type IncomeSummary = {
  period: { kind: 'year' | 'month'; year: number; month: number | null };
  /** 서울 기준 오늘 (YYYY-MM-DD) */
  today: string;
  /** 구분 필터. 없으면 전체 계약 */
  mine: IncomeMineFilter | null;
  confirmed: { amount: number; count: number };
  expected: { amount: number; count: number };
  /** 기간 안의 구분별 계약 건수. mine과 상관없이 전체 계약 기준 */
  counts: { all: number; listing: number; client: number };
  /** 기간이 속한 해의 월별 합(mine 반영). 월별 보기에서도 그 해 전체를 준다. 계약이 있는 달만 */
  months: IncomeMonth[];
  contracts: IncomeContract[];
};

function toSeoulDateString(date: Date): string {
  return new Date(date.getTime() + SEOUL_OFFSET_MS).toISOString().slice(0, 10);
}

type Period = IncomeSummary['period'];

function resolvePeriod(
  { year, month }: Pick<IncomeQueryDto, 'year' | 'month'>,
  today: string,
): Period {
  if (year !== undefined && month !== undefined) {
    throw new BadRequestException('Use either year or month, not both');
  }

  if (month !== undefined) {
    const [y, m] = month.split('-').map(Number);
    return { kind: 'month', month: m, year: y };
  }

  if (year !== undefined) {
    return { kind: 'year', month: null, year };
  }

  // 기간을 주지 않으면 이번 달(서울)을 본다.
  return { kind: 'month', month: Number(today.slice(5, 7)), year: Number(today.slice(0, 4)) };
}

/** 해의 잔금일 범위 (DATE 컬럼, 이상·미만). 월별 보기도 흐름 막대를 위해 그 해 전체를 읽는다. */
function yearRange(year: number) {
  return { gte: toDateOnly(`${year}-01-01`), lt: toDateOnly(`${year + 1}-01-01`) };
}

function matchesMine(
  contract: Pick<IncomeContract, 'isMyListing' | 'isMyClient'>,
  mine: IncomeMineFilter | null,
): boolean {
  if (mine === 'listing') {
    return contract.isMyListing;
  }

  if (mine === 'client') {
    return contract.isMyClient;
  }

  return true;
}

const CONTRACT_SELECT = {
  balanceDueOn: true,
  commission: true,
  contractedOn: true,
  id: true,
  isMyClient: true,
  isMyListing: true,
  listing: { select: { name: true } },
  meeting: { select: { code: true, customer: { select: { name: true } } } },
  status: true,
} as const;

@Injectable()
export class GoodplaceIncomeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 기간 안에 잔금일이 있는 계약의 수수료를 확정·예정으로 나눈다.
   * 확정 = 계약완료이고 잔금일이 오늘(서울) 이전·당일, 예정 = 계약예정 전부 + 잔금일이 아직인 계약완료.
   * mine을 주면 내 매물(isMyListing) 또는 내 손님(isMyClient) 계약만 합계·months·contracts에 넣는다.
   * counts(구분별 건수)는 mine과 상관없이 기간 안의 전체 계약으로 센다.
   */
  async get(query: IncomeQueryDto, now: Date = new Date()): Promise<IncomeSummary> {
    const today = toSeoulDateString(now);
    const period = resolvePeriod(query, today);
    const mine = query.mine ?? null;

    // 구분별 건수를 함께 세야 하므로 mine은 DB가 아니라 아래에서 거른다.
    const rows = await this.prisma.goodplaceContract.findMany({
      orderBy: [{ balanceDueOn: 'asc' }, { createdAt: 'asc' }],
      select: CONTRACT_SELECT,
      where: {
        balanceDueOn: yearRange(period.year),
        status: { in: INCOME_CONTRACT_STATUSES },
      },
    });

    const yearContracts = rows
      .map((row): IncomeContract => {
        const dueOn = toDateString(row.balanceDueOn);
        const confirmed = row.status === 'completed' && dueOn <= today;

        return {
          balanceDueOn: dueOn,
          caseCode: row.meeting.code,
          commission: row.commission,
          contractedOn: toDateString(row.contractedOn),
          customer: { name: row.meeting.customer.name },
          id: row.id,
          incomeState: confirmed ? 'confirmed' : 'expected',
          isMyClient: row.isMyClient,
          isMyListing: row.isMyListing,
          listing: { name: row.listing.name },
          status: row.status,
        };
      })
      .sort(
        (a, b) =>
          a.balanceDueOn.localeCompare(b.balanceDueOn) || a.caseCode.localeCompare(b.caseCode),
      );

    const periodContracts =
      period.kind === 'month'
        ? yearContracts.filter(
            (contract) => Number(contract.balanceDueOn.slice(5, 7)) === period.month,
          )
        : yearContracts;
    const counts = {
      all: periodContracts.length,
      client: periodContracts.filter((contract) => contract.isMyClient).length,
      listing: periodContracts.filter((contract) => contract.isMyListing).length,
    };
    const contracts = periodContracts.filter((contract) => matchesMine(contract, mine));

    const confirmed = { amount: 0, count: 0 };
    const expected = { amount: 0, count: 0 };

    for (const contract of contracts) {
      if (contract.incomeState === 'confirmed') {
        confirmed.amount += contract.commission;
        confirmed.count += 1;
      } else {
        expected.amount += contract.commission;
        expected.count += 1;
      }
    }

    const byMonth = new Map<number, IncomeMonth>();

    for (const contract of yearContracts.filter((row) => matchesMine(row, mine))) {
      const monthNumber = Number(contract.balanceDueOn.slice(5, 7));
      const month = byMonth.get(monthNumber) ?? {
        confirmedAmount: 0,
        count: 0,
        expectedAmount: 0,
        month: monthNumber,
      };
      month.count += 1;

      if (contract.incomeState === 'confirmed') {
        month.confirmedAmount += contract.commission;
      } else {
        month.expectedAmount += contract.commission;
      }

      byMonth.set(monthNumber, month);
    }

    return {
      confirmed,
      contracts,
      counts,
      expected,
      mine,
      months: [...byMonth.values()].sort((a, b) => a.month - b.month),
      period,
      today,
    };
  }
}
