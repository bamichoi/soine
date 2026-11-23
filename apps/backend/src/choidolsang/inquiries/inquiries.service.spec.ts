import type { PrismaService } from '../../prisma/prisma.service';
import { ChoidolsangInquiriesService, INQUIRY_PAGE_SIZE } from './inquiries.service';

describe('ChoidolsangInquiriesService', () => {
  let count: jest.Mock;
  let findMany: jest.Mock;
  let service: ChoidolsangInquiriesService;

  beforeEach(() => {
    count = jest.fn(() => 'count-query');
    findMany = jest.fn(() => 'find-query');
    const prisma = {
      $transaction: jest.fn(() =>
        Promise.resolve([
          45,
          [
            {
              content: '돌잔치 상차림 문의드립니다.',
              createdAt: new Date('2026-11-20T01:00:00.000Z'),
              desiredConcept: '한복 클래식',
              desiredReservationAt: new Date('2026-12-05T02:00:00.000Z'),
              id: 'inquiry-1',
              inquiredOn: new Date('2026-11-20T00:00:00.000Z'),
              location: '서울 강남구',
              status: 'pending',
              updatedAt: new Date('2026-11-20T01:00:00.000Z'),
            },
            {
              content: '가격 문의',
              createdAt: new Date('2026-11-19T01:00:00.000Z'),
              desiredConcept: null,
              desiredReservationAt: null,
              id: 'inquiry-2',
              inquiredOn: new Date('2026-11-19T00:00:00.000Z'),
              location: null,
              status: 'rejected',
              updatedAt: new Date('2026-11-19T01:00:00.000Z'),
            },
          ],
        ]),
      ),
      choidolsangInquiry: { count, findMany },
    } as unknown as PrismaService;
    service = new ChoidolsangInquiriesService(prisma);
  });

  it('returns newest inquiries first with the requested page', async () => {
    const result = await service.list(2);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ inquiredOn: 'desc' }, { createdAt: 'desc' }],
      skip: INQUIRY_PAGE_SIZE,
      take: INQUIRY_PAGE_SIZE,
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: INQUIRY_PAGE_SIZE,
      total: 45,
      totalPages: 3,
    });
  });

  it('serializes dates and keeps empty optional fields as null', async () => {
    const { items } = await service.list();

    expect(items).toEqual([
      {
        content: '돌잔치 상차림 문의드립니다.',
        desiredConcept: '한복 클래식',
        desiredReservationAt: '2026-12-05T02:00:00.000Z',
        id: 'inquiry-1',
        inquiredOn: '2026-11-20',
        location: '서울 강남구',
        status: 'pending',
      },
      {
        content: '가격 문의',
        desiredConcept: null,
        desiredReservationAt: null,
        id: 'inquiry-2',
        inquiredOn: '2026-11-19',
        location: null,
        status: 'rejected',
      },
    ]);
  });
});
