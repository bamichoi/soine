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
  it('offers only available listings when picking', async () => {
    const findMany = jest.fn(() => Promise.resolve([LISTING]));
    const service = new KkiruListingsService({
      kkiruListing: { findMany },
    } as unknown as PrismaService);

    const options = await service.options({ q: '연남' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ...buildListingSearch('연남'), status: 'available' },
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
});
