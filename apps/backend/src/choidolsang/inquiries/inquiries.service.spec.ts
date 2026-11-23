import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  buildInquiryOrderBy,
  buildInquiryWhere,
  ChoidolsangInquiriesService,
  INQUIRY_PAGE_SIZE,
} from './inquiries.service';

const INQUIRY = {
  code: '7K3FQ9AM',
  content: '돌잔치 상차림 문의드립니다.\n인원은 10명입니다.',
  createdAt: new Date('2026-11-20T01:00:00.000Z'),
  desiredConcept: '한복 클래식',
  desiredReservationAt: new Date('2026-12-05T02:00:00.000Z'),
  id: 'inquiry-1',
  inquiredOn: new Date('2026-11-20T00:00:00.000Z'),
  location: '서울 강남구',
  status: 'pending',
  updatedAt: new Date('2026-11-21T01:00:00.000Z'),
};

describe('buildInquiryWhere', () => {
  it('returns no condition for an empty query', () => {
    expect(buildInquiryWhere('all', '')).toEqual({});
  });

  it('searches a text field case-insensitively', () => {
    expect(buildInquiryWhere('location', '강남')).toEqual({
      location: { contains: '강남', mode: 'insensitive' },
    });
  });

  it('matches part of the inquiry code, ignoring case and #', () => {
    expect(buildInquiryWhere('code', '#7k3f')).toEqual({ code: { contains: '7K3F' } });
  });

  it('returns nothing for a code with invalid characters', () => {
    expect(buildInquiryWhere('code', '문의')).toEqual({ id: { in: [] } });
  });

  it('matches status by Korean label', () => {
    expect(buildInquiryWhere('status', '확정')).toEqual({ status: { in: ['confirmed'] } });
  });

  it('searches every field for all, skipping the code when the query cannot be a code', () => {
    expect(buildInquiryWhere('all', '대기')).toEqual({
      // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
      OR: [
        { content: { contains: '대기', mode: 'insensitive' } },
        { location: { contains: '대기', mode: 'insensitive' } },
        { desiredConcept: { contains: '대기', mode: 'insensitive' } },
        { status: { in: ['pending'] } },
      ],
    });
  });
});

describe('buildInquiryOrderBy', () => {
  it('breaks ties by newest registration', () => {
    expect(buildInquiryOrderBy('inquiredOn', 'desc')).toEqual([
      { inquiredOn: 'desc' },
      { createdAt: 'desc' },
    ]);
  });

  it('puts empty values last', () => {
    expect(buildInquiryOrderBy('location', 'asc')).toEqual([
      { location: { nulls: 'last', sort: 'asc' } },
      { createdAt: 'desc' },
    ]);
  });
});

describe('ChoidolsangInquiriesService', () => {
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let updateMany: jest.Mock;
  let service: ChoidolsangInquiriesService;

  beforeEach(() => {
    findMany = jest.fn(() => 'find-query');
    findUnique = jest.fn(() => Promise.resolve(INQUIRY));
    create = jest.fn(() => Promise.resolve(INQUIRY));
    updateMany = jest.fn(() => Promise.resolve({ count: 1 }));
    const prisma = {
      $transaction: jest.fn(() => Promise.resolve([45, [INQUIRY]])),
      choidolsangInquiry: { count: jest.fn(), create, findMany, findUnique, updateMany },
    } as unknown as PrismaService;
    service = new ChoidolsangInquiriesService(prisma);
  });

  it('defaults to the newest inquiry date first and paginates', async () => {
    const result = await service.list({ page: 2 });

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ inquiredOn: 'desc' }, { createdAt: 'desc' }],
      skip: INQUIRY_PAGE_SIZE,
      take: INQUIRY_PAGE_SIZE,
      where: {},
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: INQUIRY_PAGE_SIZE,
      total: 45,
      totalPages: 3,
    });
    expect(result.items[0]).toEqual({
      code: '7K3FQ9AM',
      content: INQUIRY.content,
      desiredConcept: '한복 클래식',
      desiredReservationAt: '2026-12-05T02:00:00.000Z',
      id: 'inquiry-1',
      inquiredOn: '2026-11-20',
      location: '서울 강남구',
      status: 'pending',
    });
  });

  it('returns the detail by code, case-insensitively', async () => {
    await expect(service.findByCode('7k3fq9am')).resolves.toMatchObject({
      code: '7K3FQ9AM',
      createdAt: '2026-11-20T01:00:00.000Z',
      updatedAt: '2026-11-21T01:00:00.000Z',
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { code: '7K3FQ9AM' } });
  });

  it('throws 404 for an unknown or malformed code', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.findByCode('ZZZZZZZZ')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findByCode('../etc')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates an inquiry with a random code, a plain date and pending by default', async () => {
    await service.create({
      content: '가격 문의',
      desiredReservationAt: '2026-12-05T11:00:00+09:00',
      inquiredOn: '2026-11-23',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        code: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{8}$/),
        content: '가격 문의',
        desiredConcept: null,
        desiredReservationAt: new Date('2026-12-05T02:00:00.000Z'),
        inquiredOn: new Date('2026-11-23T00:00:00.000Z'),
        location: null,
        rejectionReason: null,
        status: 'pending',
      },
    });
  });

  it('retries with a new code when the code collides', async () => {
    create
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          clientVersion: 'test',
          code: 'P2002',
          meta: { target: ['code'] },
        }),
      )
      .mockResolvedValueOnce(INQUIRY);

    await expect(
      service.create({ content: '문의', inquiredOn: '2026-11-23' }),
    ).resolves.toMatchObject({ code: '7K3FQ9AM' });
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe('ChoidolsangInquiriesService status changes', () => {
  let findUnique: jest.Mock;
  let updateMany: jest.Mock;
  let create: jest.Mock;
  let service: ChoidolsangInquiriesService;

  beforeEach(() => {
    findUnique = jest.fn(() => Promise.resolve({ ...INQUIRY, rejectionReason: null }));
    updateMany = jest.fn(() => Promise.resolve({ count: 1 }));
    create = jest.fn(() => Promise.resolve(INQUIRY));
    const prisma = {
      choidolsangInquiry: { create, findUnique, updateMany },
    } as unknown as PrismaService;
    service = new ChoidolsangInquiriesService(prisma);
  });

  it('rejects a pending inquiry with a reason', async () => {
    findUnique.mockResolvedValue({ ...INQUIRY, rejectionReason: '일정 불가', status: 'rejected' });

    await expect(service.reject('7k3fq9am', '일정 불가')).resolves.toMatchObject({
      rejectionReason: '일정 불가',
      status: 'rejected',
    });
    expect(updateMany).toHaveBeenCalledWith({
      data: { rejectionReason: '일정 불가', status: 'rejected' },
      where: { code: '7K3FQ9AM', status: 'pending' },
    });
  });

  it('refuses to reject an inquiry that is not pending', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    findUnique.mockResolvedValue({ ...INQUIRY, status: 'confirmed' });

    await expect(service.reject('7K3FQ9AM', '사유')).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 when changing an unknown inquiry', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    findUnique.mockResolvedValue(null);

    await expect(service.reopen('ZZZZZZZZ')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reopens a rejected inquiry and clears the reason', async () => {
    await service.reopen('7K3FQ9AM');

    expect(updateMany).toHaveBeenCalledWith({
      data: { rejectionReason: null, status: 'pending' },
      where: { code: '7K3FQ9AM', status: 'rejected' },
    });
  });

  it('keeps the rejection reason only when created as rejected', async () => {
    await service.create({
      content: '문의',
      inquiredOn: '2026-11-23',
      rejectionReason: '무시될 사유',
      status: 'pending',
    });
    await service.create({
      content: '문의',
      inquiredOn: '2026-11-23',
      rejectionReason: '일정 불가',
      status: 'rejected',
    });

    expect(create.mock.calls[0][0].data.rejectionReason).toBeNull();
    expect(create.mock.calls[1][0].data.rejectionReason).toBe('일정 불가');
  });
});
