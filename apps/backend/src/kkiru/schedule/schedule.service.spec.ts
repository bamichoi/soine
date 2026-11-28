import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { KkiruScheduleService } from './schedule.service';

type Contract = {
  id: string;
  contractedOn: Date;
  balanceDueOn: Date;
  balance: number;
  status: string;
  createdAt: Date;
  listing: { name: string };
  meeting: { code: string; customer: { name: string } };
};

function day(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function contract(overrides: Partial<Contract> & { id: string }): Contract {
  return {
    balance: 2700,
    balanceDueOn: day('2026-12-01'),
    contractedOn: day('2026-11-25'),
    createdAt: day('2026-11-25'),
    listing: { name: `매물-${overrides.id}` },
    meeting: { code: 'K7K3FQ9A', customer: { name: '김임차' } },
    status: 'contracting',
    ...overrides,
  };
}

type DateRange = { gte: Date; lt: Date };
type ContractWhere = {
  contractedOn?: DateRange;
  balanceDueOn?: DateRange;
  status: { in: string[] };
};

function inRange(value: Date, range: DateRange) {
  return value >= range.gte && value < range.lt;
}

function setup(contracts: Contract[]) {
  const prisma = {
    $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
    kkiruContract: {
      findMany: jest.fn(({ where }: { where: ContractWhere }) =>
        Promise.resolve(
          contracts.filter(
            (row) =>
              where.status.in.includes(row.status) &&
              (!where.contractedOn || inRange(row.contractedOn, where.contractedOn)) &&
              (!where.balanceDueOn || inRange(row.balanceDueOn, where.balanceDueOn)),
          ),
        ),
      ),
    },
    kkiruMeeting: { findMany: jest.fn(() => Promise.resolve([])) },
  };

  return new KkiruScheduleService(prisma as unknown as PrismaService);
}

describe('KkiruScheduleService balance items', () => {
  it('shows a balance item on the balance due date, linked to the contract', async () => {
    const service = setup([contract({ id: 'contract-1' })]);

    const items = await service.list({ from: '2026-11-30', to: '2027-01-11' });

    expect(items).toEqual([
      {
        balance: 2700,
        caseCode: 'K7K3FQ9A',
        customerName: '김임차',
        date: '2026-12-01',
        id: 'contract-1',
        kind: 'balance',
        listingName: '매물-contract-1',
        status: 'contracting',
      },
    ]);
  });

  it('shows the contract and its balance separately when both fall in the range', async () => {
    const service = setup([
      contract({ id: 'contract-1', status: 'completed' }),
      contract({ balanceDueOn: day('2027-02-01'), id: 'contract-2' }),
    ]);

    const items = await service.list({ from: '2026-11-23', to: '2027-01-04' });

    expect(items.map((item) => `${item.kind}:${item.id}:${item.date}`)).toEqual([
      'contract:contract-1:2026-11-25',
      'contract:contract-2:2026-11-25',
      'balance:contract-1:2026-12-01',
    ]);
  });

  it('leaves out cancelled contracts', async () => {
    const service = setup([contract({ id: 'contract-1', status: 'cancelled' })]);

    await expect(service.list({ from: '2026-11-23', to: '2027-01-04' })).resolves.toEqual([]);
  });

  it('refuses a range that is too long', async () => {
    await expect(setup([]).list({ from: '2026-01-01', to: '2026-06-01' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
