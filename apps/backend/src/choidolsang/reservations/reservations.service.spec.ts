import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { buildReservationWhere, ChoidolsangReservationsService } from './reservations.service';

const CONCEPT = {
  components: [],
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  deletedAt: null,
  id: '11111111-1111-4111-8111-111111111111',
  name: '한복 클래식',
  price: 250000,
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
};

const RESERVATION = {
  babyGender: 'girl',
  babyName: '서윤',
  cancelledAt: null,
  code: 'R7K3FQ9A',
  completedAt: null,
  concept: CONCEPT,
  conceptId: CONCEPT.id,
  confirmedOn: new Date('2026-11-24T00:00:00.000Z'),
  createdAt: new Date('2026-11-24T01:00:00.000Z'),
  customerName: '김고객',
  customerPhone: '01012345678',
  depositAmount: 50000,
  eventAt: new Date('2026-12-05T02:00:00.000Z'),
  eventLocation: '서울 강남구',
  extraComponents: ['풍선'],
  guestCount: 10,
  hasSnap: true,
  id: 'reservation-1',
  inquiry: { code: '7K3FQ9AM' },
  inquiryId: 'inquiry-1',
  requests: null,
  status: 'reserved',
  totalAmount: 300000,
  updatedAt: new Date('2026-11-24T01:00:00.000Z'),
};

const INPUT = {
  babyGender: 'boy' as const,
  babyName: '도윤',
  confirmedOn: '2026-11-24',
  conceptId: CONCEPT.id,
  customerName: '김고객',
  customerPhone: '01012345678',
  eventAt: '2026-12-05T11:00:00+09:00',
  eventLocation: '서울 강남구',
  guestCount: 12,
  hasSnap: false,
  inquiryCode: '7k3fq9am',
  totalAmount: 300000,
};

function createPrismaMock() {
  const reservation = {
    count: jest.fn(),
    create: jest.fn(() => Promise.resolve({ code: 'R7K3FQ9A' })),
    findMany: jest.fn(),
    findUnique: jest.fn((): Promise<unknown> => Promise.resolve(RESERVATION)),
    updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
  };
  const inquiry = {
    findFirst: jest.fn(
      (): Promise<unknown> => Promise.resolve({ id: 'inquiry-1', status: 'pending' }),
    ),
    findUniqueOrThrow: jest.fn(() =>
      Promise.resolve({ code: '7K3FQ9AM', id: 'inquiry-1', status: 'pending' }),
    ),
    update: jest.fn(() => Promise.resolve({})),
  };
  const concept = {
    findFirst: jest.fn((): Promise<unknown> => Promise.resolve({ id: CONCEPT.id })),
  };
  const tx = {
    $executeRaw: jest.fn(() => Promise.resolve(1)),
    choidolsangConcept: concept,
    choidolsangInquiry: inquiry,
    choidolsangReservation: reservation,
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };

  return {
    concept,
    inquiry,
    reservation,
    service: new ChoidolsangReservationsService(prisma as unknown as PrismaService),
    tx,
  };
}

describe('ChoidolsangReservationsService create', () => {
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    mock = createPrismaMock();
  });

  it('creates a reservation numbered like its inquiry and confirms the inquiry', async () => {
    const result = await mock.service.create(INPUT);

    expect(mock.tx.$executeRaw).toHaveBeenCalled();
    expect(mock.reservation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: '7K3FQ9AM',
        conceptId: CONCEPT.id,
        confirmedOn: new Date('2026-11-24T00:00:00.000Z'),
        customerPhone: '01012345678',
        depositAmount: 50000,
        eventAt: new Date('2026-12-05T02:00:00.000Z'),
        babyGender: 'boy',
        babyName: '도윤',
        extraComponents: [],
        guestCount: 12,
        hasSnap: false,
        inquiryId: 'inquiry-1',
        totalAmount: 300000,
      }),
    });
    expect(mock.inquiry.update).toHaveBeenCalledWith({
      data: { rejectionReason: null, status: 'confirmed' },
      where: { id: 'inquiry-1' },
    });
    expect(result).toMatchObject({ balanceAmount: 250000, inquiryCode: '7K3FQ9AM' });
  });

  it('refuses a deposit larger than the total', async () => {
    await expect(mock.service.create({ ...INPUT, depositAmount: 400000 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mock.reservation.create).not.toHaveBeenCalled();
  });

  it('refuses an inquiry that is already confirmed or cancelled', async () => {
    mock.inquiry.findUniqueOrThrow.mockResolvedValue({
      code: '7K3FQ9AM',
      id: 'inquiry-1',
      status: 'confirmed',
    });

    await expect(mock.service.create(INPUT)).rejects.toBeInstanceOf(ConflictException);
    expect(mock.reservation.create).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing or deleted inquiry', async () => {
    mock.inquiry.findFirst.mockResolvedValue(null);

    await expect(mock.service.create(INPUT)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses an unknown or deleted concept', async () => {
    mock.concept.findFirst.mockResolvedValue(null);

    await expect(mock.service.create(INPUT)).rejects.toBeInstanceOf(BadRequestException);
    expect(mock.reservation.create).not.toHaveBeenCalled();
  });

  it('turns a second reservation for the same inquiry into 409', async () => {
    mock.reservation.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: 'test',
        code: 'P2002',
        meta: { target: ['inquiryId'] },
      }),
    );

    await expect(mock.service.create(INPUT)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ChoidolsangReservationsService status changes', () => {
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    mock = createPrismaMock();
  });

  it('cancels a reserved reservation and cancels the inquiry', async () => {
    await mock.service.cancel('r7k3fq9a');

    expect(mock.reservation.updateMany).toHaveBeenCalledWith({
      data: { cancelledAt: expect.any(Date), status: 'cancelled' },
      where: { code: 'R7K3FQ9A', status: 'reserved' },
    });
    expect(mock.inquiry.update).toHaveBeenCalledWith({
      data: { status: 'cancelled' },
      where: { id: 'inquiry-1' },
    });
  });

  it('completes a reserved reservation without touching the inquiry', async () => {
    await mock.service.complete('R7K3FQ9A');

    expect(mock.reservation.updateMany).toHaveBeenCalledWith({
      data: { completedAt: expect.any(Date), status: 'completed' },
      where: { code: 'R7K3FQ9A', status: 'reserved' },
    });
    expect(mock.inquiry.update).not.toHaveBeenCalled();
  });

  it('returns 409 when the reservation is no longer reserved', async () => {
    mock.reservation.updateMany.mockResolvedValue({ count: 0 });

    await expect(mock.service.cancel('R7K3FQ9A')).rejects.toBeInstanceOf(ConflictException);
    expect(mock.inquiry.update).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown reservation', async () => {
    mock.reservation.findUnique.mockResolvedValue(null);

    await expect(mock.service.complete('ZZZZZZZZ')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ChoidolsangReservationsService calendar', () => {
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    mock = createPrismaMock();
    mock.reservation.findMany.mockResolvedValue([
      {
        code: 'R7K3FQ9A',
        concept: { name: '한복 클래식' },
        customerName: '김고객',
        eventAt: new Date('2026-12-05T02:00:00.000Z'),
        eventLocation: '서울 강남구',
        status: 'reserved',
      },
    ]);
  });

  it('lists reserved and completed reservations in the Korean date range', async () => {
    const items = await mock.service.listForCalendar({ from: '2026-11-29', to: '2027-01-10' });

    expect(mock.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventAt: {
            gte: new Date('2026-11-28T15:00:00.000Z'),
            lt: new Date('2027-01-09T15:00:00.000Z'),
          },
          status: { in: ['reserved', 'completed'] },
        },
      }),
    );
    expect(items).toEqual([
      {
        code: 'R7K3FQ9A',
        conceptName: '한복 클래식',
        customerName: '김고객',
        eventAt: '2026-12-05T02:00:00.000Z',
        eventLocation: '서울 강남구',
        status: 'reserved',
      },
    ]);
  });

  it('refuses an empty, reversed or too long range', async () => {
    await expect(
      mock.service.listForCalendar({ from: '2026-12-01', to: '2026-12-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      mock.service.listForCalendar({ from: '2026-01-01', to: '2026-12-31' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ChoidolsangReservationsService update', () => {
  const { inquiryCode: _inquiryCode, ...FIELDS } = INPUT;
  const OTHER_CONCEPT_ID = '22222222-2222-4222-8222-222222222222';
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    mock = createPrismaMock();
    mock.reservation.findUnique.mockResolvedValue({
      ...RESERVATION,
      conceptId: CONCEPT.id,
      status: 'reserved',
    });
  });

  it('updates a reserved reservation, guarded by the reserved status', async () => {
    await mock.service.update('r7k3fq9a', { ...FIELDS, guestCount: 20 });

    expect(mock.reservation.updateMany).toHaveBeenCalledWith({
      data: expect.objectContaining({ conceptId: CONCEPT.id, guestCount: 20 }),
      where: { code: 'R7K3FQ9A', status: 'reserved' },
    });
    // 같은 컨셉이면 삭제 여부를 다시 확인하지 않는다.
    expect(mock.concept.findFirst).not.toHaveBeenCalled();
  });

  it('checks a newly chosen concept', async () => {
    mock.concept.findFirst.mockResolvedValue(null);

    await expect(
      mock.service.update('R7K3FQ9A', { ...FIELDS, conceptId: OTHER_CONCEPT_ID }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mock.reservation.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to edit a completed or cancelled reservation', async () => {
    mock.reservation.findUnique.mockResolvedValue({ ...RESERVATION, status: 'completed' });

    await expect(mock.service.update('R7K3FQ9A', FIELDS)).rejects.toBeInstanceOf(ConflictException);
    expect(mock.reservation.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a deposit larger than the total', async () => {
    await expect(
      mock.service.update('R7K3FQ9A', { ...FIELDS, depositAmount: 999999 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 for an unknown reservation', async () => {
    mock.reservation.findUnique.mockResolvedValue(null);

    await expect(mock.service.update('ZZZZZZZZ', FIELDS)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('buildReservationWhere', () => {
  it('searches only the chosen field', () => {
    expect(buildReservationWhere('babyName', '하준')).toEqual({
      babyName: { contains: '하준', mode: 'insensitive' },
    });
    expect(buildReservationWhere('customerPhone', '010-1234')).toEqual({
      customerPhone: { contains: '0101234' },
    });
  });

  it('returns nothing when the query cannot match the chosen field', () => {
    expect(buildReservationWhere('customerPhone', '김')).toEqual({ id: { in: [] } });
  });

  it('searches every usable field for all', () => {
    const where = buildReservationWhere('all', '한복');

    expect(where.OR).toContainEqual({
      concept: { name: { contains: '한복', mode: 'insensitive' } },
    });
    expect(where.OR).not.toContainEqual(
      expect.objectContaining({ customerPhone: expect.anything() }),
    );
  });
});
