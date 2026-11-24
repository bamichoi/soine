import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { ChoidolsangReservationsService } from './reservations.service';

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
    findUniqueOrThrow: jest.fn(() => Promise.resolve({ id: 'inquiry-1', status: 'pending' })),
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

  it('creates a reservation from the inquiry and confirms the inquiry', async () => {
    const result = await mock.service.create(INPUT);

    expect(mock.tx.$executeRaw).toHaveBeenCalled();
    expect(mock.reservation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{8}$/),
        conceptId: CONCEPT.id,
        confirmedOn: new Date('2026-11-24T00:00:00.000Z'),
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
    mock.inquiry.findUniqueOrThrow.mockResolvedValue({ id: 'inquiry-1', status: 'confirmed' });

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
