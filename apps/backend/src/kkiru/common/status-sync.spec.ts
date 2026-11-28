import type { Prisma } from '../../generated/prisma/client';
import {
  deriveListingStatus,
  deriveMeetingStatus,
  lockMeetingListings,
  syncMeetingAndListings,
} from './status-sync';

describe('deriveMeetingStatus', () => {
  it('is meeting without contracts', () => {
    expect(deriveMeetingStatus({ contractStatuses: [], isStopped: false })).toBe('meeting');
  });

  it('puts a completed contract first, then a contract in progress', () => {
    expect(
      deriveMeetingStatus({ contractStatuses: ['cancelled', 'completed'], isStopped: false }),
    ).toBe('contracted');
    expect(
      deriveMeetingStatus({ contractStatuses: ['cancelled', 'contracting'], isStopped: true }),
    ).toBe('contracting');
  });

  it('is stopped before contract cancelled', () => {
    expect(deriveMeetingStatus({ contractStatuses: ['cancelled'], isStopped: true })).toBe(
      'stopped',
    );
    expect(deriveMeetingStatus({ contractStatuses: [], isStopped: true })).toBe('stopped');
  });

  it('is contract cancelled when only cancelled contracts remain', () => {
    expect(
      deriveMeetingStatus({ contractStatuses: ['cancelled', 'cancelled'], isStopped: false }),
    ).toBe('contract_cancelled');
  });
});

describe('deriveListingStatus', () => {
  it('is available without contracts or open meetings', () => {
    expect(deriveListingStatus({ contractStatuses: [], meetingStatuses: [] })).toBe('available');
    expect(
      deriveListingStatus({
        contractStatuses: ['cancelled'],
        meetingStatuses: ['stopped', 'contracting', 'contracted'],
      }),
    ).toBe('available');
  });

  it('is meeting while it is in a meeting that can still contract', () => {
    expect(deriveListingStatus({ contractStatuses: [], meetingStatuses: ['meeting'] })).toBe(
      'meeting',
    );
    expect(
      deriveListingStatus({
        contractStatuses: ['cancelled'],
        meetingStatuses: ['stopped', 'contract_cancelled'],
      }),
    ).toBe('meeting');
  });

  it('takes its own contracts before meetings', () => {
    expect(
      deriveListingStatus({ contractStatuses: ['contracting'], meetingStatuses: ['meeting'] }),
    ).toBe('contracting');
    expect(
      deriveListingStatus({
        contractStatuses: ['contracting', 'completed'],
        meetingStatuses: ['meeting'],
      }),
    ).toBe('contracted');
  });
});

function createTx() {
  const calls: string[] = [];
  const tx = {
    $executeRawUnsafe: jest.fn((_sql: string, id: string) => {
      calls.push(`lock:${id}`);
      return Promise.resolve(1);
    }),
    kkiruContract: {
      findMany: jest.fn((args: { where: { listingId?: string } }) =>
        Promise.resolve(
          args.where.listingId
            ? [{ status: args.where.listingId === 'listing-b' ? 'contracting' : 'cancelled' }]
            : [{ listingId: 'listing-b' }],
        ),
      ),
    },
    kkiruListing: {
      update: jest.fn((args: { data: { status: string }; where: { id: string } }) => {
        calls.push(`listing:${args.where.id}:${args.data.status}`);
        return Promise.resolve({});
      }),
    },
    kkiruMeeting: {
      findUniqueOrThrow: jest.fn(() =>
        Promise.resolve({ contracts: [{ status: 'contracting' }], stoppedAt: null }),
      ),
      update: jest.fn((args: { data: { status: string } }) => {
        calls.push(`meeting:${args.data.status}`);
        return Promise.resolve({});
      }),
    },
    kkiruMeetingListing: {
      findMany: jest.fn((args: { where: { listingId?: string } }) =>
        Promise.resolve(
          args.where.listingId
            ? [{ meeting: { status: 'contracting' } }]
            : [{ listingId: 'listing-c' }, { listingId: 'listing-a' }, { listingId: 'listing-b' }],
        ),
      ),
    },
  };

  return { calls, tx: tx as unknown as Prisma.TransactionClient };
}

describe('syncMeetingAndListings', () => {
  it('locks the listings in id order once, including extra ones', async () => {
    const { calls, tx } = createTx();

    expect(await lockMeetingListings(tx, 'meeting-1', ['listing-0', 'listing-a'])).toEqual([
      'listing-0',
      'listing-a',
      'listing-b',
      'listing-c',
    ]);
    expect(calls).toEqual(['lock:listing-0', 'lock:listing-a', 'lock:listing-b', 'lock:listing-c']);
  });

  it('syncs the meeting first and then every meeting and contract listing', async () => {
    const { calls, tx } = createTx();

    await expect(syncMeetingAndListings(tx, 'meeting-1')).resolves.toBe('contracting');
    expect(calls).toEqual([
      'meeting:contracting',
      'lock:listing-a',
      'lock:listing-b',
      'lock:listing-c',
      'listing:listing-a:available',
      'listing:listing-b:contracting',
      'listing:listing-c:available',
    ]);
  });
});
