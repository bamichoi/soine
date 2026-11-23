import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { ChoidolsangConceptsService, CONCEPT_PAGE_SIZE } from './concepts.service';

const CONCEPT = {
  components: ['상차림 테이블', '떡 모형', '꽃 장식'],
  createdAt: new Date('2026-11-20T01:00:00.000Z'),
  deletedAt: null,
  id: '11111111-1111-4111-8111-111111111111',
  name: '한복 클래식',
  price: 250000,
  updatedAt: new Date('2026-11-21T01:00:00.000Z'),
};

describe('ChoidolsangConceptsService', () => {
  let concept: Record<string, jest.Mock>;
  let service: ChoidolsangConceptsService;

  beforeEach(() => {
    concept = {
      count: jest.fn(),
      create: jest.fn(() => Promise.resolve(CONCEPT)),
      findFirst: jest.fn((): Promise<unknown> => Promise.resolve(CONCEPT)),
      findMany: jest.fn(() => 'find-query'),
      updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
    };
    const prisma = {
      $transaction: jest.fn(() => Promise.resolve([21, [CONCEPT]])),
      choidolsangConcept: concept,
    } as unknown as PrismaService;
    service = new ChoidolsangConceptsService(prisma);
  });

  it('lists newest first, paginates and hides deleted concepts', async () => {
    const result = await service.list({ page: 2 });

    expect(concept.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: CONCEPT_PAGE_SIZE,
      take: CONCEPT_PAGE_SIZE,
      where: { deletedAt: null },
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: CONCEPT_PAGE_SIZE,
      total: 21,
      totalPages: 2,
    });
    expect(result.items[0]).toMatchObject({ name: '한복 클래식', price: 250000 });
  });

  it('searches by name case-insensitively', async () => {
    await service.list({ q: '한복' });

    expect(concept.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, name: { contains: '한복', mode: 'insensitive' } },
      }),
    );
  });

  it('stores missing components as an empty list', async () => {
    await service.create({ name: '모던 화이트', price: 180000 });

    expect(concept.create).toHaveBeenCalledWith({
      data: { components: [], name: '모던 화이트', price: 180000 },
    });
  });

  it('returns 404 for a missing or deleted concept', async () => {
    concept.findFirst.mockResolvedValue(null);
    concept.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.findById(CONCEPT.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(CONCEPT.id, { name: '이름', price: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove(CONCEPT.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('soft-deletes by recording deletedAt', async () => {
    await service.remove(CONCEPT.id);

    expect(concept.updateMany).toHaveBeenCalledWith({
      data: { deletedAt: expect.any(Date) },
      where: { deletedAt: null, id: CONCEPT.id },
    });
  });
});

describe('ChoidolsangConceptsService options', () => {
  it('lists selectable concepts by name with id, name and price only', async () => {
    const findMany = jest.fn(() => Promise.resolve([]));
    const prisma = { choidolsangConcept: { findMany } } as unknown as PrismaService;

    await new ChoidolsangConceptsService(prisma).listOptions();

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, price: true },
      where: { deletedAt: null },
    });
  });
});
