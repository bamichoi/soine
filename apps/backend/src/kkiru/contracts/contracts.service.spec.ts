import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  createFakeKkiruDb,
  type FakeContract,
  type FakeLink,
  type FakeListing,
} from '../common/fake-kkiru-db.helper-spec';
import { KkiruContractsService } from './contracts.service';

const FIELDS = {
  balance: 2700,
  balanceDueOn: '2026-12-01',
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

const CODE = 'K7K3FQ9A';

function listing(id: string, status = 'meeting'): FakeListing {
  return { clientName: `의뢰인-${id}`, clientPhone: '01011112222', id, status };
}

function setup({
  meetingStatus = 'meeting',
  stoppedAt = null,
  listings = [listing('listing-a'), listing('listing-b')],
  links = [
    { listingId: 'listing-a', meetingId: 'meeting-1' },
    { listingId: 'listing-b', meetingId: 'meeting-1' },
  ],
  contracts = [],
}: {
  meetingStatus?: string;
  stoppedAt?: Date | null;
  listings?: FakeListing[];
  links?: FakeLink[];
  contracts?: FakeContract[];
} = {}) {
  const fake = createFakeKkiruDb({
    contracts,
    links,
    listings,
    meetings: [{ code: CODE, id: 'meeting-1', status: meetingStatus, stoppedAt }],
  });
  const service = new KkiruContractsService(fake.prisma);
  jest.spyOn(service, 'findById').mockResolvedValue({} as never);

  return { ...fake, service };
}

describe('KkiruContractsService.create', () => {
  it('starts a contract on a meeting listing, copying the landlord from the listing client', async () => {
    const { db, listing: listingOf, meeting, service } = setup();

    await service.create({ ...FIELDS, listingId: 'listing-a', meetingCode: 'k7k3fq9a' });

    expect(db.contracts).toEqual([
      expect.objectContaining({
        balance: 2700,
        balanceDueOn: new Date('2026-12-01T00:00:00.000Z'),
        landlordName: '의뢰인-listing-a',
        landlordPhone: '01011112222',
        listingId: 'listing-a',
        meetingId: 'meeting-1',
        status: 'contracting',
      }),
    ]);
    expect(meeting('meeting-1')?.status).toBe('contracting');
    expect(listingOf('listing-a')?.status).toBe('contracting');
    // 계약이 진행 중인 미팅의 다른 미팅 매물은 미팅중이 아니다.
    expect(listingOf('listing-b')?.status).toBe('available');
  });

  it('adds a listing that is not in the meeting yet', async () => {
    const {
      db,
      listing: listingOf,
      service,
    } = setup({
      listings: [listing('listing-a'), listing('listing-z', 'available')],
      links: [{ listingId: 'listing-a', meetingId: 'meeting-1' }],
    });

    await service.create({ ...FIELDS, listingId: 'listing-z', meetingCode: CODE });

    expect(db.links).toContainEqual({ listingId: 'listing-z', meetingId: 'meeting-1' });
    expect(listingOf('listing-z')?.status).toBe('contracting');
  });

  it('locks the meeting first, then the listings in id order', async () => {
    const { db, service } = setup();

    await service.create({ ...FIELDS, listingId: 'listing-b', meetingCode: CODE });

    expect(db.locks.slice(0, 3)).toEqual([
      'meetings:meeting-1',
      'listings:listing-a',
      'listings:listing-b',
    ]);
  });

  it('can start again after a cancelled contract', async () => {
    const { db, meeting, service } = setup({
      contracts: [
        { id: 'old', listingId: 'listing-a', meetingId: 'meeting-1', status: 'cancelled' },
      ],
      meetingStatus: 'contract_cancelled',
    });

    await service.create({ ...FIELDS, listingId: 'listing-b', meetingCode: CODE });

    expect(db.contracts).toHaveLength(2);
    expect(meeting('meeting-1')?.status).toBe('contracting');
  });

  it.each([
    'stopped',
    'contracting',
    'contracted',
  ])('refuses a meeting in status %s with 409', async (meetingStatus) => {
    const { db, service } = setup({ meetingStatus });

    await expect(
      service.create({ ...FIELDS, listingId: 'listing-a', meetingCode: CODE }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.contracts).toHaveLength(0);
  });

  it('refuses a second contract when the meeting has one in progress or completed', async () => {
    for (const status of ['contracting', 'completed']) {
      // 상태가 어긋난 데이터라도 계약 수로 한 번 더 막는다.
      const { service } = setup({
        contracts: [{ id: 'other', listingId: 'listing-a', meetingId: 'meeting-1', status }],
      });

      await expect(
        service.create({ ...FIELDS, listingId: 'listing-b', meetingCode: CODE }),
      ).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('refuses a listing that another customer is contracting or has contracted', async () => {
    for (const status of ['contracting', 'contracted']) {
      const { db, service } = setup({ listings: [listing('listing-a', status)] });

      await expect(
        service.create({ ...FIELDS, listingId: 'listing-a', meetingCode: CODE }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(db.contracts).toHaveLength(0);
    }
  });

  it('refuses an unknown meeting or listing and a lease that ends before it starts', async () => {
    await expect(
      setup().service.create({ ...FIELDS, listingId: 'listing-a', meetingCode: 'ZZZZZZZZ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      setup().service.create({ ...FIELDS, listingId: 'missing', meetingCode: CODE }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      setup().service.create({
        ...FIELDS,
        leaseEndOn: '2026-11-01',
        listingId: 'listing-a',
        meetingCode: CODE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('KkiruContractsService balance', () => {
  it('refuses a balance due date before the contract date', async () => {
    const { db, service } = setup();

    await expect(
      service.create({
        ...FIELDS,
        balanceDueOn: '2026-11-24',
        listingId: 'listing-a',
        meetingCode: CODE,
      }),
    ).rejects.toThrow('잔금일은 계약 일자와 같거나 뒤여야 합니다.');
    expect(db.contracts).toHaveLength(0);
  });

  it('accepts a balance due date on the contract date', async () => {
    const { db, service } = setup();

    await service.create({
      ...FIELDS,
      balanceDueOn: FIELDS.contractedOn,
      listingId: 'listing-a',
      meetingCode: CODE,
    });

    expect(db.contracts[0]).toEqual(
      expect.objectContaining({ balanceDueOn: new Date('2026-11-25T00:00:00.000Z') }),
    );
  });

  it('saves the edited balance and balance due date as given', async () => {
    const { db, service } = setup({
      contracts: [
        { id: 'contract-1', listingId: 'listing-a', meetingId: 'meeting-1', status: 'contracting' },
      ],
      listings: [listing('listing-a', 'contracting')],
      meetingStatus: 'contracting',
    });

    // 잔금은 보증금 − 계약금과 달라도 그대로 저장한다.
    await service.update('contract-1', { ...FIELDS, balance: 1000, balanceDueOn: '2026-12-20' });

    expect(db.contracts[0]).toEqual(
      expect.objectContaining({
        balance: 1000,
        balanceDueOn: new Date('2026-12-20T00:00:00.000Z'),
      }),
    );
  });

  it('refuses an edit that moves the balance due date before the contract date', async () => {
    const { db, service } = setup({
      contracts: [
        {
          balanceDueOn: new Date('2026-12-01T00:00:00.000Z'),
          id: 'contract-1',
          listingId: 'listing-a',
          meetingId: 'meeting-1',
          status: 'contracting',
        } as FakeContract,
      ],
      listings: [listing('listing-a', 'contracting')],
      meetingStatus: 'contracting',
    });

    await expect(
      service.update('contract-1', { ...FIELDS, contractedOn: '2026-12-02' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.contracts[0]).toEqual(
      expect.objectContaining({ balanceDueOn: new Date('2026-12-01T00:00:00.000Z') }),
    );
  });
});

describe('KkiruContractsService complete and cancel', () => {
  const inProgress = {
    contracts: [
      { id: 'contract-1', listingId: 'listing-a', meetingId: 'meeting-1', status: 'contracting' },
    ],
    listings: [listing('listing-a', 'contracting'), listing('listing-b', 'available')],
    meetingStatus: 'contracting',
  };

  it('completes the contract, the meeting and the listing', async () => {
    const { db, listing: listingOf, meeting, service } = setup(inProgress);

    await service.complete('contract-1');

    expect(db.contracts[0]).toEqual(
      expect.objectContaining({ completedAt: expect.any(Date), status: 'completed' }),
    );
    expect(meeting('meeting-1')?.status).toBe('contracted');
    expect(listingOf('listing-a')?.status).toBe('contracted');
    expect(listingOf('listing-b')?.status).toBe('available');
  });

  it('cancels with a reason in the meeting log and reopens the meeting listings', async () => {
    const { db, listing: listingOf, meeting, service } = setup(inProgress);

    await service.cancel('contract-1', '임대인 변심');

    expect(db.contracts[0]).toEqual(
      expect.objectContaining({ cancelReason: '임대인 변심', status: 'cancelled' }),
    );
    expect(db.records).toEqual([
      expect.objectContaining({
        content: '임대인 변심',
        kind: 'contract_cancelled',
        meetingId: 'meeting-1',
      }),
    ]);
    expect(meeting('meeting-1')?.status).toBe('contract_cancelled');
    expect(listingOf('listing-a')?.status).toBe('meeting');
    expect(listingOf('listing-b')?.status).toBe('meeting');
  });

  it('refuses to complete or cancel a contract that is not in progress', async () => {
    const { service } = setup({
      contracts: [
        { id: 'contract-1', listingId: 'listing-a', meetingId: 'meeting-1', status: 'completed' },
      ],
    });

    await expect(service.cancel('contract-1', '사유')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.complete('contract-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
