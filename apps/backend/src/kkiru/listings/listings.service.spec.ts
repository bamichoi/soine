import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { buildListingSearch, KkiruListingsService } from './listings.service';

const LISTING = {
  address: '서울 마포구 연남동 1-1',
  areaM2: new Prisma.Decimal('66.12'),
  clientName: '박임대',
  clientPhone: '01011112222',
  code: 'P7K3FQ9A',
  createdAt: new Date('2026-11-25T01:00:00.000Z'),
  deposit: 3000,
  features: null,
  floor: '1층',
  hasParking: true,
  id: 'listing-1',
  name: '연남동 코너 상가',
  premium: 5000,
  rent: 250,
  restroomCount: 1,
  status: 'available',
  updatedAt: new Date('2026-11-25T01:00:00.000Z'),
};

describe('KkiruListingsService', () => {
  it('offers listings that are not contracted when picking', async () => {
    const findMany = jest.fn(() => Promise.resolve([LISTING]));
    const service = new KkiruListingsService({
      kkiruListing: { findMany },
    } as unknown as PrismaService);

    const options = await service.options({ q: '연남' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ...buildListingSearch('연남'), status: { not: 'contracted' } },
      }),
    );
    expect(options[0]).toMatchObject({ areaM2: 66.12, code: 'P7K3FQ9A', name: '연남동 코너 상가' });
  });

  it('stores the area as a decimal and never takes the status from the form', async () => {
    const create = jest.fn(() => Promise.resolve(LISTING));
    const service = new KkiruListingsService({
      kkiruListing: { create },
    } as unknown as PrismaService);

    await service.create({
      address: '서울 마포구 연남동 1-1',
      areaM2: 66.12,
      clientName: '박임대',
      clientPhone: '01011112222',
      deposit: 3000,
      floor: '1층',
      name: '연남동 코너 상가',
      premium: 5000,
      rent: 250,
    });

    const data = (create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data.areaM2).toEqual(new Prisma.Decimal('66.12'));
    expect(data).not.toHaveProperty('status');
  });

  it('returns the meetings this listing was shown in, latest first, with the latest contract', async () => {
    const findUnique = jest.fn(() => Promise.resolve(LISTING));
    const findMany = jest.fn(() =>
      Promise.resolve([
        {
          meeting: {
            code: 'M2222222',
            contracts: [
              {
                contractedOn: new Date('2026-11-20T00:00:00.000Z'),
                id: 'contract-2',
                status: 'cancelled',
              },
            ],
            customer: { name: '김고객' },
            meetAt: new Date('2026-11-18T05:00:00.000Z'),
            status: 'contract_cancelled',
            title: '카페 창업 미팅',
          },
        },
        {
          meeting: {
            code: 'M1111111',
            contracts: [],
            customer: { name: '이고객' },
            meetAt: new Date('2026-11-10T05:00:00.000Z'),
            status: 'stopped',
            title: '음식점 미팅',
          },
        },
      ]),
    );
    const service = new KkiruListingsService({
      kkiruListing: { findUnique },
      kkiruMeetingListing: { findMany },
    } as unknown as PrismaService);

    const detail = await service.findByCode('p7k3fq9a');

    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'P7K3FQ9A' } });
    const query = (
      findMany.mock.calls[0] as unknown as [
        {
          where: unknown;
          orderBy: unknown[];
          select: { meeting: { select: { contracts: Record<string, unknown> } } };
        },
      ]
    )[0];
    expect(query.where).toEqual({ listingId: 'listing-1' });
    expect(query.orderBy[0]).toEqual({ meeting: { meetAt: 'desc' } });
    // 계약은 이 매물로 맺은 것만, 가장 최근 한 건. 계약취소도 이력이므로 상태로 거르지 않는다.
    expect(query.select.meeting.select.contracts).toMatchObject({
      orderBy: [{ createdAt: 'desc' }],
      take: 1,
      where: { listingId: 'listing-1' },
    });
    expect(detail.code).toBe('P7K3FQ9A');
    expect(detail.meetings).toEqual([
      {
        code: 'M2222222',
        contract: { contractedOn: '2026-11-20', id: 'contract-2', status: 'cancelled' },
        customer: { name: '김고객' },
        meetAt: '2026-11-18T05:00:00.000Z',
        status: 'contract_cancelled',
        title: '카페 창업 미팅',
      },
      {
        code: 'M1111111',
        contract: null,
        customer: { name: '이고객' },
        meetAt: '2026-11-10T05:00:00.000Z',
        status: 'stopped',
        title: '음식점 미팅',
      },
    ]);
  });

  it('does not look up meetings for an unknown listing', async () => {
    const findMany = jest.fn();
    const service = new KkiruListingsService({
      kkiruListing: { findUnique: jest.fn(() => Promise.resolve(null)) },
      kkiruMeetingListing: { findMany },
    } as unknown as PrismaService);

    await expect(service.findByCode('ZZZZZZZZ')).rejects.toBeInstanceOf(NotFoundException);
    expect(findMany).not.toHaveBeenCalled();
  });
});
