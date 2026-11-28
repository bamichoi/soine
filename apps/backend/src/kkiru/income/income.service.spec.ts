import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { PrismaService } from '../../prisma/prisma.service';
import { IncomeQueryDto } from './dto/income.dto';
import { KkiruIncomeService } from './income.service';

type Contract = {
  id: string;
  contractedOn: Date;
  balanceDueOn: Date;
  commission: number;
  status: string;
  isMyListing: boolean;
  isMyClient: boolean;
  createdAt: Date;
  listing: { name: string };
  meeting: { code: string; customer: { name: string } };
};

function day(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** 서울 시각 (UTC+9) */
function seoul(dateTime: string): Date {
  return new Date(`${dateTime}+09:00`);
}

function contract(overrides: Partial<Contract> & { id: string }): Contract {
  return {
    balanceDueOn: day('2026-12-01'),
    commission: 300,
    contractedOn: day('2026-11-01'),
    createdAt: day('2026-11-01'),
    isMyClient: true,
    isMyListing: false,
    listing: { name: `매물-${overrides.id}` },
    meeting: { code: `CODE-${overrides.id}`, customer: { name: '김임차' } },
    status: 'contracting',
    ...overrides,
  };
}

type Where = {
  balanceDueOn: { gte: Date; lt: Date };
  status: { in: string[] };
  isMyListing?: boolean;
  isMyClient?: boolean;
};

function matches(row: Contract, where: Where) {
  return (
    where.status.in.includes(row.status) &&
    (where.isMyListing === undefined || row.isMyListing === where.isMyListing) &&
    (where.isMyClient === undefined || row.isMyClient === where.isMyClient) &&
    row.balanceDueOn >= where.balanceDueOn.gte &&
    row.balanceDueOn < where.balanceDueOn.lt
  );
}

function setup(contracts: Contract[]) {
  const prisma = {
    kkiruContract: {
      findMany: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(contracts.filter((row) => matches(row, where))),
      ),
    },
  };

  return { prisma, service: new KkiruIncomeService(prisma as unknown as PrismaService) };
}

const NOW = seoul('2026-11-28T10:00:00');

describe('KkiruIncomeService confirmed / expected', () => {
  it('counts a completed contract due today as confirmed and tomorrow as expected', async () => {
    const { service } = setup([
      contract({ balanceDueOn: day('2026-11-28'), commission: 100, id: 'a', status: 'completed' }),
      contract({ balanceDueOn: day('2026-11-29'), commission: 200, id: 'b', status: 'completed' }),
    ]);

    const result = await service.get({ month: '2026-11' }, NOW);

    expect(result.today).toBe('2026-11-28');
    expect(result.confirmed).toEqual({ amount: 100, count: 1 });
    expect(result.expected).toEqual({ amount: 200, count: 1 });
    expect(result.contracts.map((row) => [row.id, row.incomeState])).toEqual([
      ['a', 'confirmed'],
      ['b', 'expected'],
    ]);
  });

  it('keeps a contracting contract expected even after its due date', async () => {
    const { service } = setup([
      contract({ balanceDueOn: day('2026-11-20'), commission: 150, id: 'late' }),
      contract({ balanceDueOn: day('2026-11-28'), commission: 50, id: 'today' }),
      contract({
        balanceDueOn: day('2026-11-10'),
        commission: 420,
        id: 'done',
        status: 'completed',
      }),
    ]);

    const result = await service.get({ month: '2026-11' }, NOW);
    const byId = Object.fromEntries(result.contracts.map((row) => [row.id, row]));

    expect(byId.late.incomeState).toBe('expected');
    expect(byId.today.incomeState).toBe('expected');
    expect(byId.done.incomeState).toBe('confirmed');
    expect(result.expected).toEqual({ amount: 200, count: 2 });
    expect(result.confirmed).toEqual({ amount: 420, count: 1 });
  });

  it('leaves cancelled contracts out', async () => {
    const { service } = setup([
      contract({ commission: 300, id: 'ok', status: 'completed' }),
      contract({ commission: 999, id: 'x', status: 'cancelled' }),
    ]);

    const result = await service.get({ year: 2026 }, NOW);

    expect(result.contracts.map((row) => row.id)).toEqual(['ok']);
    expect(result.expected).toEqual({ amount: 300, count: 1 });
    expect(result.confirmed).toEqual({ amount: 0, count: 0 });
    expect(result).not.toHaveProperty('cancelledCount');
  });

  it('returns the contract fields the list needs', async () => {
    const { service } = setup([
      contract({ id: 'a', isMyClient: false, isMyListing: true, status: 'completed' }),
    ]);

    const [row] = (await service.get({ month: '2026-12' }, NOW)).contracts;

    expect(row).toEqual({
      balanceDueOn: '2026-12-01',
      caseCode: 'CODE-a',
      commission: 300,
      contractedOn: '2026-11-01',
      customer: { name: '김임차' },
      id: 'a',
      incomeState: 'expected',
      isMyClient: false,
      isMyListing: true,
      listing: { name: '매물-a' },
      status: 'completed',
    });
  });
});

describe('KkiruIncomeService periods', () => {
  it('assigns contracts to the month of the balance due date, including the month edges', async () => {
    const rows = [
      contract({ balanceDueOn: day('2026-02-28'), id: 'feb' }),
      contract({ balanceDueOn: day('2026-03-01'), id: 'mar-first' }),
      contract({ balanceDueOn: day('2026-03-31'), id: 'mar-last' }),
      contract({ balanceDueOn: day('2026-04-01'), id: 'apr' }),
    ];

    const march = await setup(rows).service.get({ month: '2026-03' }, NOW);
    expect(march.contracts.map((row) => row.id)).toEqual(['mar-first', 'mar-last']);
    expect(march.period).toEqual({ kind: 'month', month: 3, year: 2026 });

    const december = await setup([
      contract({ balanceDueOn: day('2026-12-31'), id: 'dec' }),
      contract({ balanceDueOn: day('2027-01-01'), id: 'jan' }),
    ]).service.get({ month: '2026-12' }, NOW);
    expect(december.contracts.map((row) => row.id)).toEqual(['dec']);
  });

  it('lists only the months that have contracts in the year view', async () => {
    const { service } = setup([
      contract({ balanceDueOn: day('2025-12-31'), id: 'last-year' }),
      contract({
        balanceDueOn: day('2026-03-05'),
        commission: 100,
        id: 'm3',
        status: 'completed',
      }),
      contract({ balanceDueOn: day('2026-12-01'), commission: 200, id: 'm12a' }),
      contract({
        balanceDueOn: day('2026-12-02'),
        commission: 300,
        id: 'm12b',
        status: 'completed',
      }),
      contract({ balanceDueOn: day('2026-07-01'), id: 'cancelled', status: 'cancelled' }),
      contract({ balanceDueOn: day('2027-01-01'), id: 'next-year' }),
    ]);

    const result = await service.get({ year: 2026 }, NOW);

    expect(result.period).toEqual({ kind: 'year', month: null, year: 2026 });
    expect(result.months).toEqual([
      { confirmedAmount: 100, count: 1, expectedAmount: 0, month: 3 },
      { confirmedAmount: 0, count: 2, expectedAmount: 500, month: 12 },
    ]);
  });

  it('returns the whole year of months in the month view too', async () => {
    const { prisma, service } = setup([
      contract({ balanceDueOn: day('2025-12-31'), id: 'last-year' }),
      contract({
        balanceDueOn: day('2026-01-10'),
        commission: 100,
        id: 'jan',
        status: 'completed',
      }),
      contract({
        balanceDueOn: day('2026-11-05'),
        commission: 200,
        id: 'nov',
        status: 'completed',
      }),
      contract({ balanceDueOn: day('2026-12-24'), commission: 300, id: 'dec' }),
      contract({ balanceDueOn: day('2027-01-01'), id: 'next-year' }),
    ]);

    const result = await service.get({ month: '2026-11' }, NOW);
    const [[{ where }]] = prisma.kkiruContract.findMany.mock.calls;

    expect(where.balanceDueOn).toEqual({ gte: day('2026-01-01'), lt: day('2027-01-01') });
    expect(result.contracts.map((row) => row.id)).toEqual(['nov']);
    expect(result.confirmed).toEqual({ amount: 200, count: 1 });
    expect(result.expected).toEqual({ amount: 0, count: 0 });
    expect(result.months).toEqual([
      { confirmedAmount: 100, count: 1, expectedAmount: 0, month: 1 },
      { confirmedAmount: 200, count: 1, expectedAmount: 0, month: 11 },
      { confirmedAmount: 0, count: 1, expectedAmount: 300, month: 12 },
    ]);
  });

  it('defaults to this month in Seoul when no period is given', async () => {
    const { service } = setup([]);

    const result = await service.get({}, seoul('2027-01-01T00:30:00'));

    expect(result.period).toEqual({ kind: 'month', month: 1, year: 2027 });
    expect(result.today).toBe('2027-01-01');
  });

  it('switches today at Seoul midnight, not UTC midnight', async () => {
    const rows = [contract({ balanceDueOn: day('2026-11-29'), id: 'a', status: 'completed' })];

    const before = await setup(rows).service.get(
      { month: '2026-11' },
      seoul('2026-11-28T23:59:59'),
    );
    expect(before.today).toBe('2026-11-28');
    expect(before.contracts[0].incomeState).toBe('expected');

    // 서울 11-29 00:00 = UTC 11-28 15:00
    const after = await setup(rows).service.get({ month: '2026-11' }, seoul('2026-11-29T00:00:00'));
    expect(after.today).toBe('2026-11-29');
    expect(after.contracts[0].incomeState).toBe('confirmed');
  });

  it('sorts by balance due date, then case code', async () => {
    const { service } = setup([
      contract({
        balanceDueOn: day('2026-12-02'),
        id: '1',
        meeting: { code: 'AAA', customer: { name: '가' } },
      }),
      contract({
        balanceDueOn: day('2026-12-01'),
        id: '2',
        meeting: { code: 'ZZZ', customer: { name: '나' } },
      }),
      contract({
        balanceDueOn: day('2026-12-01'),
        id: '3',
        meeting: { code: 'MMM', customer: { name: '다' } },
      }),
    ]);

    const result = await service.get({ year: 2026 }, NOW);

    expect(result.contracts.map((row) => row.id)).toEqual(['3', '2', '1']);
  });

  it('rejects year and month together', async () => {
    await expect(
      setup([]).service.get({ month: '2026-11', year: 2026 }, NOW),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('KkiruIncomeService mine filter', () => {
  const rows = [
    contract({
      balanceDueOn: day('2026-03-05'),
      commission: 100,
      id: 'both',
      isMyClient: true,
      isMyListing: true,
      status: 'completed',
    }),
    contract({
      balanceDueOn: day('2026-03-20'),
      commission: 200,
      id: 'listing-only',
      isMyClient: false,
      isMyListing: true,
    }),
    contract({
      balanceDueOn: day('2026-07-01'),
      commission: 400,
      id: 'client-only',
      isMyClient: true,
      isMyListing: false,
      status: 'completed',
    }),
    contract({
      balanceDueOn: day('2026-12-01'),
      commission: 800,
      id: 'client-later',
      isMyClient: true,
      isMyListing: false,
    }),
  ];

  it('counts only my listings in totals, months and contracts', async () => {
    const { service } = setup(rows);

    const result = await service.get({ mine: 'listing', year: 2026 }, NOW);

    expect(result.mine).toBe('listing');
    expect(result.contracts.map((row) => row.id)).toEqual(['both', 'listing-only']);
    expect(result.confirmed).toEqual({ amount: 100, count: 1 });
    expect(result.expected).toEqual({ amount: 200, count: 1 });
    expect(result.months).toEqual([
      { confirmedAmount: 100, count: 2, expectedAmount: 200, month: 3 },
    ]);
  });

  it('counts only my clients in totals, months and contracts', async () => {
    const { service } = setup(rows);

    const result = await service.get({ mine: 'client', year: 2026 }, NOW);

    expect(result.mine).toBe('client');
    expect(result.contracts.map((row) => row.id)).toEqual(['both', 'client-only', 'client-later']);
    expect(result.confirmed).toEqual({ amount: 500, count: 2 });
    expect(result.expected).toEqual({ amount: 800, count: 1 });
    expect(result.months).toEqual([
      { confirmedAmount: 100, count: 1, expectedAmount: 0, month: 3 },
      { confirmedAmount: 400, count: 1, expectedAmount: 0, month: 7 },
      { confirmedAmount: 0, count: 1, expectedAmount: 800, month: 12 },
    ]);
  });

  it('uses every contract when mine is not given', async () => {
    const { prisma, service } = setup(rows);

    const result = await service.get({ year: 2026 }, NOW);
    const [[{ where }]] = prisma.kkiruContract.findMany.mock.calls;

    expect(where).not.toHaveProperty('isMyListing');
    expect(where).not.toHaveProperty('isMyClient');
    expect(result.mine).toBeNull();
    expect(result.contracts).toHaveLength(4);
  });

  it('counts every contract of the period by kind, whatever mine is', async () => {
    const all = await setup(rows).service.get({ year: 2026 }, NOW);
    const listing = await setup(rows).service.get({ mine: 'listing', year: 2026 }, NOW);
    const march = await setup(rows).service.get({ mine: 'client', month: '2026-03' }, NOW);

    expect(all.counts).toEqual({ all: 4, client: 3, listing: 2 });
    expect(listing.counts).toEqual({ all: 4, client: 3, listing: 2 });
    expect(march.counts).toEqual({ all: 2, client: 1, listing: 2 });
    expect(march.contracts.map((row) => row.id)).toEqual(['both']);
  });

  it('applies mine to the year months of the month view', async () => {
    const result = await setup(rows).service.get({ mine: 'listing', month: '2026-07' }, NOW);

    expect(result.contracts).toEqual([]);
    expect(result.counts).toEqual({ all: 1, client: 1, listing: 0 });
    expect(result.months).toEqual([
      { confirmedAmount: 100, count: 2, expectedAmount: 200, month: 3 },
    ]);
  });
});

describe('IncomeQueryDto', () => {
  function propertiesOf(input: Record<string, unknown>) {
    return validateSync(plainToInstance(IncomeQueryDto, input)).map((error) => error.property);
  }

  it('accepts a year from 2000 to 2100 and a YYYY-MM month', () => {
    expect(propertiesOf({})).toEqual([]);
    expect(propertiesOf({ year: '2000' })).toEqual([]);
    expect(propertiesOf({ year: '2100' })).toEqual([]);
    expect(propertiesOf({ month: '2026-01' })).toEqual([]);
    expect(propertiesOf({ month: '2100-12' })).toEqual([]);
    expect(propertiesOf({ mine: 'listing' })).toEqual([]);
    expect(propertiesOf({ mine: 'client' })).toEqual([]);
  });

  it('rejects out-of-range or malformed values', () => {
    expect(propertiesOf({ year: '1999' })).toEqual(['year']);
    expect(propertiesOf({ year: '2101' })).toEqual(['year']);
    expect(propertiesOf({ year: '2026.5' })).toEqual(['year']);
    expect(propertiesOf({ year: 'abcd' })).toEqual(['year']);
    expect(propertiesOf({ month: '2026-13' })).toEqual(['month']);
    expect(propertiesOf({ month: '2026-00' })).toEqual(['month']);
    expect(propertiesOf({ month: '2026-1' })).toEqual(['month']);
    expect(propertiesOf({ month: '1999-12' })).toEqual(['month']);
    expect(propertiesOf({ month: '2101-01' })).toEqual(['month']);
    expect(propertiesOf({ mine: 'both' })).toEqual(['mine']);
    expect(propertiesOf({ mine: '' })).toEqual(['mine']);
  });
});
