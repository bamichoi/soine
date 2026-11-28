import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { KkiruContractsService, mergeHistory } from './contracts.service';

const FIELDS = {
  commission: 300,
  contractedOn: '2026-11-25',
  deposit: 3000,
  downPayment: 300,
  isMyClient: true,
  isMyListing: false,
  landlordSameAsClient: true,
  leaseEndOn: '2028-11-30',
  leaseStartOn: '2026-12-01',
  premium: 4500,
  rent: 230,
  specialTerms: null,
};

const LISTING = {
  clientName: '박임대',
  clientPhone: '01011112222',
  id: 'listing-1',
  status: 'available',
};

function createService(meetingStatus = 'meeting', contractStatus = 'contracting') {
  const meeting = {
    findUnique: jest.fn(
      (): Promise<unknown> =>
        Promise.resolve({ consultationId: 'consultation-1', id: 'meeting-1', listing: LISTING }),
    ),
    findUniqueOrThrow: jest.fn(() => Promise.resolve({ status: meetingStatus })),
    findMany: jest.fn(() => Promise.resolve([{ status: 'contracting' }])),
    update: jest.fn(() => Promise.resolve({})),
  };
  const contract = {
    create: jest.fn(() => Promise.resolve({ id: 'contract-1' })),
    findUnique: jest.fn(
      (): Promise<unknown> =>
        Promise.resolve({ meeting: { consultationId: 'consultation-1', id: 'meeting-1' } }),
    ),
    findUniqueOrThrow: jest.fn(() =>
      Promise.resolve({
        meeting: {
          consultationId: 'consultation-1',
          id: 'meeting-1',
          listing: LISTING,
          listingId: 'listing-1',
        },
        meetingId: 'meeting-1',
        status: contractStatus,
      }),
    ),
    update: jest.fn(() => Promise.resolve({})),
  };
  const tx = {
    $executeRawUnsafe: jest.fn(() => Promise.resolve(1)),
    kkiruConsultation: { update: jest.fn(() => Promise.resolve({})) },
    kkiruContract: contract,
    kkiruListing: {
      findUniqueOrThrow: jest.fn(() => Promise.resolve({ status: LISTING.status })),
      update: jest.fn(() => Promise.resolve({})),
    },
    kkiruMeeting: meeting,
    kkiruMeetingRecord: { create: jest.fn(() => Promise.resolve({})) },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const service = new KkiruContractsService(prisma as unknown as PrismaService);
  jest.spyOn(service, 'findById').mockResolvedValue({} as never);

  return { contract, meeting, service, tx };
}

describe('KkiruContractsService', () => {
  it('starts a contract from a meeting, copying the landlord from the listing client', async () => {
    const { contract, meeting, service, tx } = createService();

    await service.create({ ...FIELDS, meetingId: 'meeting-1' });

    expect(contract.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        landlordName: '박임대',
        landlordPhone: '01011112222',
        meetingId: 'meeting-1',
      }),
    });
    expect(meeting.update).toHaveBeenCalledWith({
      data: { status: 'contracting' },
      where: { id: 'meeting-1' },
    });
    expect(tx.kkiruConsultation.update).toHaveBeenCalledWith({
      data: { status: 'contracting' },
      where: { id: 'consultation-1' },
    });
  });

  it('refuses to start a contract while another one is in progress or the meeting is stopped', async () => {
    await expect(
      createService('contracting').service.create({ ...FIELDS, meetingId: 'meeting-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      createService('stopped').service.create({ ...FIELDS, meetingId: 'meeting-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a lease that ends before it starts', async () => {
    await expect(
      createService().service.create({
        ...FIELDS,
        leaseEndOn: '2026-11-01',
        meetingId: 'meeting-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('completes the contract, the meeting and the listing', async () => {
    const { contract, meeting, service, tx } = createService();
    // 계약완료 뒤 이 매물의 미팅 상태를 읽으면 계약완료가 있다.
    meeting.findMany.mockResolvedValue([{ status: 'contracted' }]);

    await service.complete('contract-1');

    expect(contract.update).toHaveBeenCalledWith({
      data: { completedAt: expect.any(Date), status: 'completed' },
      where: { id: 'contract-1' },
    });
    expect(meeting.update).toHaveBeenCalledWith({
      data: { status: 'contracted' },
      where: { id: 'meeting-1' },
    });
    expect(tx.kkiruListing.update).toHaveBeenCalledWith({
      data: { status: 'contracted' },
      where: { id: 'listing-1' },
    });
  });

  it('cancels with a reason and logs it on the meeting', async () => {
    const { meeting, service, tx } = createService();

    await service.cancel('contract-1', '임대인 변심');

    expect(meeting.update).toHaveBeenCalledWith({
      data: { status: 'contract_cancelled' },
      where: { id: 'meeting-1' },
    });
    expect(tx.kkiruMeetingRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: '임대인 변심',
        kind: 'contract_cancelled',
        meetingId: 'meeting-1',
      }),
    });
  });

  it('refuses to complete or cancel a contract that is not in progress', async () => {
    await expect(
      createService('meeting', 'completed').service.cancel('contract-1', '사유'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('mergeHistory', () => {
  it('merges consultation and meeting records by date', () => {
    const at = (day: string) => new Date(`2026-11-${day}T00:00:00.000Z`);
    const history = mergeHistory(
      [{ content: '첫 상담', createdAt: at('01'), id: 'c1', recordedOn: at('01') }],
      [
        { content: '현장 방문', createdAt: at('05'), id: 'm1', kind: 'note', recordedOn: at('05') },
        { content: '재방문', createdAt: at('03'), id: 'm0', kind: 'note', recordedOn: at('03') },
      ],
    );

    expect(history.map((entry) => `${entry.source}:${entry.id}`)).toEqual([
      'consultation:c1',
      'meeting:m0',
      'meeting:m1',
    ]);
  });
});
