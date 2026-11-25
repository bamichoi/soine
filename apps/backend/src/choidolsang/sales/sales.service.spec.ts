import type { PrismaService } from '../../prisma/prisma.service';
import { ChoidolsangSalesService } from './sales.service';

const CONCEPT_A = { deletedAt: null, id: 'concept-a', name: '한복 클래식' };
const CONCEPT_B = {
  deletedAt: new Date('2026-11-20T00:00:00.000Z'),
  id: 'concept-b',
  name: '모던 화이트',
};

function createService(results: unknown[]) {
  const reservation = {
    aggregate: jest.fn((args: unknown) => args),
    count: jest.fn((args: unknown) => args),
    findMany: jest.fn((args: unknown) => args),
  };
  const prisma = {
    $transaction: jest.fn(() => Promise.resolve(results)),
    choidolsangReservation: reservation,
  };

  return { reservation, service: new ChoidolsangSalesService(prisma as unknown as PrismaService) };
}

describe('ChoidolsangSalesService summary', () => {
  it('sums completed reservations by completion time, with trend, concepts and change', async () => {
    const { reservation, service } = createService([
      { _count: 3, _sum: { totalAmount: 800000 } },
      { _sum: { totalAmount: 400000 } },
      { _count: 2, _sum: { totalAmount: 600000 } },
      [
        { completedAt: new Date('2026-11-15T03:00:00.000Z'), totalAmount: 250000 },
        { completedAt: new Date('2026-11-22T03:00:00.000Z'), totalAmount: 550000 },
        { completedAt: new Date('2026-10-05T03:00:00.000Z'), totalAmount: 400000 },
      ],
      [
        { concept: CONCEPT_A, totalAmount: 250000 },
        { concept: CONCEPT_B, totalAmount: 280000 },
        { concept: CONCEPT_B, totalAmount: 270000 },
      ],
    ]);

    const summary = await service.summary({ month: '2026-11' });

    expect(reservation.aggregate).toHaveBeenCalledWith({
      _count: true,
      _sum: { totalAmount: true },
      where: {
        completedAt: {
          gte: new Date('2026-10-31T15:00:00.000Z'),
          lt: new Date('2026-11-30T15:00:00.000Z'),
        },
        status: 'completed',
      },
    });
    expect(summary).toMatchObject({
      averageAmount: 266667,
      changeRate: 100,
      count: 3,
      expected: { count: 2, totalAmount: 600000 },
      period: { key: '2026-11', kind: 'month' },
      previousTotalAmount: 400000,
      totalAmount: 800000,
    });
    expect(summary.trend).toHaveLength(12);
    expect(summary.trend.at(-1)).toEqual({ count: 2, month: '2026-11', totalAmount: 800000 });
    expect(summary.trend.at(-2)).toEqual({ count: 1, month: '2026-10', totalAmount: 400000 });
    expect(summary.byConcept).toEqual([
      {
        conceptId: 'concept-b',
        count: 2,
        isDeleted: true,
        name: '모던 화이트',
        share: 68.8,
        totalAmount: 550000,
      },
      {
        conceptId: 'concept-a',
        count: 1,
        isDeleted: false,
        name: '한복 클래식',
        share: 31.3,
        totalAmount: 250000,
      },
    ]);
  });

  it('returns zeros and no change rate when there are no sales', async () => {
    const { service } = createService([
      { _count: 0, _sum: { totalAmount: null } },
      { _sum: { totalAmount: null } },
      { _count: 0, _sum: { totalAmount: null } },
      [],
      [],
    ]);

    await expect(service.summary({ year: 2026 })).resolves.toMatchObject({
      averageAmount: 0,
      byConcept: [],
      changeRate: null,
      count: 0,
      period: { key: '2026', kind: 'year' },
      totalAmount: 0,
    });
  });
});

describe('ChoidolsangSalesService items', () => {
  it('lists completed reservations of the period, newest completion first', async () => {
    const { reservation, service } = createService([
      1,
      [
        {
          code: 'PWB9QT10',
          completedAt: new Date('2026-11-15T03:00:00.000Z'),
          concept: { name: '한복 클래식' },
          customerName: '박민지',
          eventAt: new Date('2026-11-15T02:00:00.000Z'),
          totalAmount: 250000,
        },
      ],
    ]);

    const result = await service.items({ month: '2026-11', page: 1 });

    expect(reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }] }),
    );
    expect(result.items[0]).toEqual({
      code: 'PWB9QT10',
      completedAt: '2026-11-15T03:00:00.000Z',
      conceptName: '한복 클래식',
      customerName: '박민지',
      eventAt: '2026-11-15T02:00:00.000Z',
      totalAmount: 250000,
    });
    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });
});
