import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DEFAULT_PAGE_SIZE } from '../../common/page-size';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  buildInquiryOrderBy,
  buildInquiryWhere,
  ChoidolsangInquiriesService,
} from './inquiries.service';

const RECORD_ORDER = [{ recordedOn: 'asc' }, { createdAt: 'asc' }];

const FIRST_RECORD = {
  content: '돌잔치 상차림 문의드립니다.\n인원은 10명입니다.',
  createdAt: new Date('2026-11-20T01:00:00.000Z'),
  id: 'record-1',
  inquiryId: 'inquiry-1',
  recordedOn: new Date('2026-11-20T00:00:00.000Z'),
};

const CONCEPT = {
  components: [],
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  deletedAt: null,
  id: '11111111-1111-4111-8111-111111111111',
  name: '한복 클래식',
  price: 250000,
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
};

const INCLUDE = {
  desiredConcept: true,
  records: { orderBy: RECORD_ORDER },
  reservation: { select: { code: true } },
};

const INQUIRY = {
  code: '7K3FQ9AM',
  createdAt: new Date('2026-11-20T01:00:00.000Z'),
  deletedAt: null,
  desiredConcept: CONCEPT,
  desiredConceptId: CONCEPT.id,
  desiredReservationAt: new Date('2026-12-05T02:00:00.000Z'),
  id: 'inquiry-1',
  inquiredOn: new Date('2026-11-20T00:00:00.000Z'),
  location: '서울 강남구',
  records: [FIRST_RECORD],
  rejectionReason: null,
  status: 'pending',
  updatedAt: new Date('2026-11-21T01:00:00.000Z'),
};

function createPrismaMock() {
  const inquiry = {
    count: jest.fn(),
    create: jest.fn((_args: { data: Record<string, unknown> }) => Promise.resolve(INQUIRY)),
    findFirst: jest.fn((): Promise<unknown> => Promise.resolve(INQUIRY)),
    findMany: jest.fn(() => 'find-query'),
    update: jest.fn(() => Promise.resolve(INQUIRY)),
    updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
  };
  const record = {
    count: jest.fn(() => Promise.resolve(2)),
    create: jest.fn(() => Promise.resolve(FIRST_RECORD)),
    deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
    findFirst: jest.fn((): Promise<unknown> => Promise.resolve(FIRST_RECORD)),
    updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
  };
  const concept = {
    findFirst: jest.fn((): Promise<unknown> => Promise.resolve({ id: CONCEPT.id })),
  };
  const tx = {
    $executeRaw: jest.fn(() => Promise.resolve(1)),
    choidolsangConcept: concept,
    choidolsangInquiry: inquiry,
    choidolsangInquiryRecord: record,
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function' ? arg(tx) : Promise.resolve([45, [INQUIRY]]),
    ),
  };

  return {
    concept,
    inquiry,
    record,
    service: new ChoidolsangInquiriesService(prisma as unknown as PrismaService),
    tx,
  };
}

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

  it('searches every field for all, skipping the code when the query cannot be a code', () => {
    expect(buildInquiryWhere('all', '대기')).toEqual({
      // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
      OR: [
        { records: { some: { content: { contains: '대기', mode: 'insensitive' } } } },
        { location: { contains: '대기', mode: 'insensitive' } },
        { desiredConcept: { is: { name: { contains: '대기', mode: 'insensitive' } } } },
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
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    mock = createPrismaMock();
  });

  it('lists newest first with only the first record, hiding deleted inquiries', async () => {
    const result = await mock.service.list({ page: 2 });

    expect(mock.inquiry.findMany).toHaveBeenCalledWith({
      include: { desiredConcept: true, records: { orderBy: RECORD_ORDER, take: 1 } },
      orderBy: [{ inquiredOn: 'desc' }, { createdAt: 'desc' }],
      skip: DEFAULT_PAGE_SIZE,
      take: DEFAULT_PAGE_SIZE,
      where: { deletedAt: null },
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 45,
      totalPages: 3,
    });
    expect(result.items[0]).toEqual({
      code: '7K3FQ9AM',
      content: FIRST_RECORD.content,
      desiredConcept: { id: CONCEPT.id, isDeleted: false, name: '한복 클래식' },
      desiredReservationAt: '2026-12-05T02:00:00.000Z',
      id: 'inquiry-1',
      inquiredOn: '2026-11-20',
      location: '서울 강남구',
      status: 'pending',
    });
  });

  it('returns the detail by code, case-insensitively, with the whole log oldest first', async () => {
    await expect(mock.service.findByCode('7k3fq9am')).resolves.toMatchObject({
      code: '7K3FQ9AM',
      records: [
        {
          content: FIRST_RECORD.content,
          createdAt: '2026-11-20T01:00:00.000Z',
          id: 'record-1',
          recordedOn: '2026-11-20',
        },
      ],
    });
    expect(mock.inquiry.findFirst).toHaveBeenCalledWith({
      include: INCLUDE,
      where: { code: '7K3FQ9AM', deletedAt: null },
    });
  });

  it('throws 404 for an unknown or malformed code', async () => {
    mock.inquiry.findFirst.mockResolvedValue(null);

    await expect(mock.service.findByCode('ZZZZZZZZ')).rejects.toBeInstanceOf(NotFoundException);
    await expect(mock.service.findByCode('../etc')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates an inquiry whose content becomes the first record on the inquiry date', async () => {
    await mock.service.create({
      content: '가격 문의',
      desiredReservationAt: '2026-12-05T11:00:00+09:00',
      inquiredOn: '2026-11-23',
    });

    expect(mock.inquiry.create).toHaveBeenCalledWith({
      data: {
        code: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{8}$/),
        desiredConceptId: null,
        desiredReservationAt: new Date('2026-12-05T02:00:00.000Z'),
        inquiredOn: new Date('2026-11-23T00:00:00.000Z'),
        location: null,
        records: {
          create: [{ content: '가격 문의', recordedOn: new Date('2026-11-23T00:00:00.000Z') }],
        },
        rejectionReason: null,
        status: 'pending',
      },
      include: INCLUDE,
    });
  });

  it('retries with a new code when the code collides', async () => {
    mock.inquiry.create
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          clientVersion: 'test',
          code: 'P2002',
          meta: { target: ['code'] },
        }),
      )
      .mockResolvedValueOnce(INQUIRY);

    await expect(
      mock.service.create({ content: '문의', inquiredOn: '2026-11-23' }),
    ).resolves.toMatchObject({ code: '7K3FQ9AM' });
    expect(mock.inquiry.create).toHaveBeenCalledTimes(2);
  });

  it('keeps the rejection reason only when created as rejected', async () => {
    await mock.service.create({
      content: '문의',
      inquiredOn: '2026-11-23',
      rejectionReason: '무시될 사유',
      status: 'pending',
    });
    await mock.service.create({
      content: '문의',
      inquiredOn: '2026-11-23',
      rejectionReason: '일정 불가',
      status: 'rejected',
    });

    expect(mock.inquiry.create.mock.calls.map((call) => call[0].data.rejectionReason)).toEqual([
      null,
      '일정 불가',
    ]);
  });
});

describe('ChoidolsangInquiriesService status changes', () => {
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    mock = createPrismaMock();
  });

  it('rejects a pending inquiry with a reason', async () => {
    mock.inquiry.findFirst.mockResolvedValue({
      ...INQUIRY,
      rejectionReason: '일정 불가',
      status: 'rejected',
    });

    await expect(mock.service.reject('7k3fq9am', '일정 불가')).resolves.toMatchObject({
      rejectionReason: '일정 불가',
      status: 'rejected',
    });
    expect(mock.inquiry.updateMany).toHaveBeenCalledWith({
      data: { rejectionReason: '일정 불가', status: 'rejected' },
      where: { code: '7K3FQ9AM', deletedAt: null, status: 'pending' },
    });
  });

  it('refuses to reject an inquiry that is not pending', async () => {
    mock.inquiry.updateMany.mockResolvedValue({ count: 0 });
    mock.inquiry.findFirst.mockResolvedValue({ ...INQUIRY, status: 'confirmed' });

    await expect(mock.service.reject('7K3FQ9AM', '사유')).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 when changing an unknown inquiry', async () => {
    mock.inquiry.updateMany.mockResolvedValue({ count: 0 });
    mock.inquiry.findFirst.mockResolvedValue(null);

    await expect(mock.service.reopen('ZZZZZZZZ')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reopens a rejected inquiry and clears the reason', async () => {
    await mock.service.reopen('7K3FQ9AM');

    expect(mock.inquiry.updateMany).toHaveBeenCalledWith({
      data: { rejectionReason: null, status: 'pending' },
      where: { code: '7K3FQ9AM', deletedAt: null, status: 'rejected' },
    });
  });
});

describe('ChoidolsangInquiriesService edit and delete', () => {
  const FIELDS = { desiredConceptId: CONCEPT.id, location: '서울 마포구' };
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    mock = createPrismaMock();
  });

  it('updates only the optional fields, guarded by the status it read', async () => {
    await mock.service.update('7k3fq9am', { ...FIELDS, rejectionReason: '무시될 사유' });

    expect(mock.inquiry.updateMany).toHaveBeenCalledWith({
      data: { desiredConceptId: CONCEPT.id, desiredReservationAt: null, location: '서울 마포구' },
      where: { code: '7K3FQ9AM', deletedAt: null, status: 'pending' },
    });
  });

  it('updates the rejection reason of a rejected inquiry', async () => {
    mock.inquiry.findFirst.mockResolvedValue({
      ...INQUIRY,
      rejectionReason: '이전 사유',
      status: 'rejected',
    });

    await mock.service.update('7K3FQ9AM', { ...FIELDS, rejectionReason: '새 사유' });

    expect(mock.inquiry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rejectionReason: '새 사유' }) }),
    );
  });

  it('returns 409 when the status changed while editing', async () => {
    mock.inquiry.updateMany.mockResolvedValue({ count: 0 });

    await expect(mock.service.update('7K3FQ9AM', FIELDS)).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 when editing a missing or deleted inquiry', async () => {
    mock.inquiry.findFirst.mockResolvedValue(null);

    await expect(mock.service.update('7K3FQ9AM', FIELDS)).rejects.toBeInstanceOf(NotFoundException);
    expect(mock.inquiry.updateMany).not.toHaveBeenCalled();
  });
});

describe('ChoidolsangInquiriesService records', () => {
  const RECORD_INPUT = { content: '날짜를 바꾸고 싶어요.', recordedOn: '2026-11-25' };
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    mock = createPrismaMock();
  });

  it('adds a record, locking the inquiry and syncing the inquiry date to the first record', async () => {
    const earlier = { ...FIRST_RECORD, recordedOn: new Date('2026-11-18T00:00:00.000Z') };
    mock.record.findFirst.mockResolvedValue(earlier);

    await mock.service.addRecord('7k3fq9am', RECORD_INPUT);

    expect(mock.tx.$executeRaw).toHaveBeenCalled();
    expect(mock.record.create).toHaveBeenCalledWith({
      data: {
        content: '날짜를 바꾸고 싶어요.',
        inquiryId: 'inquiry-1',
        recordedOn: new Date('2026-11-25T00:00:00.000Z'),
      },
    });
    expect(mock.inquiry.update).toHaveBeenCalledWith({
      data: { inquiredOn: earlier.recordedOn },
      where: { id: 'inquiry-1' },
    });
  });

  it('updates a record of the same inquiry only', async () => {
    await mock.service.updateRecord('7K3FQ9AM', 'record-2', RECORD_INPUT);

    expect(mock.record.updateMany).toHaveBeenCalledWith({
      data: { content: '날짜를 바꾸고 싶어요.', recordedOn: new Date('2026-11-25T00:00:00.000Z') },
      where: { id: 'record-2', inquiryId: 'inquiry-1' },
    });
  });

  it('returns 404 for a record of another inquiry', async () => {
    mock.record.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      mock.service.updateRecord('7K3FQ9AM', 'other', RECORD_INPUT),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 404 when changing records of a missing or deleted inquiry', async () => {
    mock.inquiry.findFirst.mockResolvedValue(null);

    await expect(mock.service.addRecord('7K3FQ9AM', RECORD_INPUT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mock.record.create).not.toHaveBeenCalled();
  });
});

describe('ChoidolsangInquiriesService desired concept', () => {
  const OTHER_CONCEPT_ID = '22222222-2222-4222-8222-222222222222';
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    mock = createPrismaMock();
  });

  it('sorts by the concept name', () => {
    expect(buildInquiryOrderBy('desiredConcept', 'asc')).toEqual([
      { desiredConcept: { name: 'asc' } },
      { createdAt: 'desc' },
    ]);
  });

  it('marks a soft-deleted concept in the detail', async () => {
    mock.inquiry.findFirst.mockResolvedValue({
      ...INQUIRY,
      desiredConcept: { ...CONCEPT, deletedAt: new Date('2026-11-23T00:00:00.000Z') },
    });

    await expect(mock.service.findByCode('7K3FQ9AM')).resolves.toMatchObject({
      desiredConcept: { id: CONCEPT.id, isDeleted: true, name: '한복 클래식' },
    });
  });

  it('refuses an unknown or deleted concept when creating', async () => {
    mock.concept.findFirst.mockResolvedValue(null);

    await expect(
      mock.service.create({
        content: '문의',
        desiredConceptId: OTHER_CONCEPT_ID,
        inquiredOn: '2026-11-23',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mock.concept.findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: { deletedAt: null, id: OTHER_CONCEPT_ID },
    });
    expect(mock.inquiry.create).not.toHaveBeenCalled();
  });

  it('keeps the current concept on update even if it was deleted since', async () => {
    mock.concept.findFirst.mockResolvedValue(null);

    await mock.service.update('7K3FQ9AM', { desiredConceptId: CONCEPT.id });

    expect(mock.concept.findFirst).not.toHaveBeenCalled();
    expect(mock.inquiry.updateMany).toHaveBeenCalled();
  });

  it('checks a newly chosen concept on update', async () => {
    mock.concept.findFirst.mockResolvedValue(null);

    await expect(
      mock.service.update('7K3FQ9AM', { desiredConceptId: OTHER_CONCEPT_ID }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mock.inquiry.updateMany).not.toHaveBeenCalled();
  });
});
