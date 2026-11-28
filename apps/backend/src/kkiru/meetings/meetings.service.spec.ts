import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  createFakeKkiruDb,
  type FakeContract,
  type FakeLink,
  type FakeListing,
  type FakeRecord,
} from '../common/fake-kkiru-db.helper-spec';
import { buildMeetingSearch, KkiruMeetingsService } from './meetings.service';

const CODE = 'K7K3FQ9A';

const FIELDS = {
  desiredBusiness: '카페',
  desiredFloor: '1층',
  desiredPyeongMax: 20,
  desiredPyeongMin: 15,
  desiredRent: 250,
  inflowSource: 'naver_land' as const,
  interestArea: '연남동',
  maxDeposit: 3000,
  maxPremium: 5000,
  meetAt: '2026-11-28T14:30:00+09:00',
  title: '연남동 카페 자리',
};

function listing(id: string, status = 'available'): FakeListing {
  return { clientName: '의뢰인', clientPhone: '01011112222', id, status };
}

function setup({
  meetingStatus = 'meeting',
  stoppedAt = null,
  listings = [listing('listing-a', 'meeting'), listing('listing-b')],
  links = [{ listingId: 'listing-a', meetingId: 'meeting-1' }],
  contracts = [],
  records = [],
}: {
  meetingStatus?: string;
  stoppedAt?: Date | null;
  listings?: FakeListing[];
  links?: FakeLink[];
  contracts?: FakeContract[];
  records?: FakeRecord[];
} = {}) {
  const fake = createFakeKkiruDb({
    contracts,
    links,
    listings,
    records,
    meetings: [{ code: CODE, id: 'meeting-1', status: meetingStatus, stoppedAt }],
  });
  const service = new KkiruMeetingsService(fake.prisma);
  jest.spyOn(service, 'findByCode').mockResolvedValue({} as never);

  return { ...fake, service };
}

describe('buildMeetingSearch', () => {
  it('searches every field or only the chosen one', () => {
    expect(buildMeetingSearch('')).toEqual({});
    expect(buildMeetingSearch('연남', 'title')).toEqual({
      title: { contains: '연남', mode: 'insensitive' },
    });
    // 이름 검색어는 연락처 항목으로 찾을 수 없으므로 아무것도 맞지 않는다.
    expect(buildMeetingSearch('김', 'phone')).toEqual({ id: { in: [] } });
  });
});

describe('KkiruMeetingsService.create', () => {
  function createService(customer: unknown = { id: 'customer-1' }) {
    const meeting = { create: jest.fn(() => Promise.resolve({ code: CODE })) };
    const prisma = {
      kkiruCustomer: { findUnique: jest.fn(() => Promise.resolve(customer)) },
      kkiruMeeting: meeting,
    };
    const service = new KkiruMeetingsService(prisma as never);
    jest.spyOn(service, 'findByCode').mockResolvedValue({} as never);

    return { meeting, service };
  }

  it('creates a meeting with its first log on the Seoul date of the meeting', async () => {
    const { meeting, service } = createService();

    await service.create({
      ...FIELDS,
      content: '첫 미팅',
      customerCode: 'c7k3fq9a',
      meetAt: '2026-11-28T23:30:00+09:00',
    });

    expect(meeting.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{8}$/),
        customerId: 'customer-1',
        meetAt: new Date('2026-11-28T14:30:00.000Z'),
        records: {
          create: [
            { content: '첫 미팅', kind: 'note', recordedOn: new Date('2026-11-28T00:00:00.000Z') },
          ],
        },
      }),
    });
  });

  it('refuses an unknown customer and a reversed pyeong range', async () => {
    await expect(
      createService(null).service.create({ ...FIELDS, content: '내용', customerCode: 'ZZZZZZZZ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      createService().service.create({
        ...FIELDS,
        content: '내용',
        customerCode: 'C7K3FQ9A',
        desiredPyeongMin: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('KkiruMeetingsService listings', () => {
  it('adds a listing and makes it meeting', async () => {
    const { db, listing: listingOf, service } = setup();

    await service.addListing('k7k3fq9a', 'listing-b');

    expect(db.links).toContainEqual({ listingId: 'listing-b', meetingId: 'meeting-1' });
    expect(listingOf('listing-b')?.status).toBe('meeting');
    expect(db.locks).toEqual(['meetings:meeting-1', 'listings:listing-b']);
  });

  it('keeps a listing that another customer is contracting as contracting', async () => {
    const { listing: listingOf, service } = setup({
      contracts: [
        { id: 'other', listingId: 'listing-b', meetingId: 'meeting-2', status: 'contracting' },
      ],
      listings: [listing('listing-b', 'contracting')],
      links: [],
    });

    await service.addListing(CODE, 'listing-b');

    expect(listingOf('listing-b')?.status).toBe('contracting');
  });

  it('refuses a contracted or unknown listing', async () => {
    await expect(
      setup({ listings: [listing('listing-b', 'contracted')] }).service.addListing(
        CODE,
        'listing-b',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(setup().service.addListing(CODE, 'missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('removes only the link and makes the listing available again', async () => {
    const { db, listing: listingOf, service } = setup();

    await service.removeListing(CODE, 'listing-a');

    expect(db.links).toEqual([]);
    expect(listingOf('listing-a')?.status).toBe('available');
  });

  it('refuses to remove a listing with a contract in this meeting', async () => {
    const { db, service } = setup({
      contracts: [
        { id: 'contract-1', listingId: 'listing-a', meetingId: 'meeting-1', status: 'cancelled' },
      ],
    });

    await expect(service.removeListing(CODE, 'listing-a')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(db.links).toHaveLength(1);
  });

  it('returns 404 when the listing is not in the meeting or the meeting is unknown', async () => {
    await expect(setup().service.removeListing(CODE, 'listing-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(setup().service.removeListing('ZZZZZZZZ', 'listing-a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('KkiruMeetingsService records', () => {
  const RECORD = { content: '현장 확인', recordedOn: '2026-11-28' };

  function withRecord(listingId: string | null) {
    return setup({
      records: [{ content: '처음 내용', id: 'record-1', listingId, meetingId: 'meeting-1' }],
    });
  }

  it('adds a record with or without a related meeting listing', async () => {
    const { db, service } = setup();

    await service.addRecord(CODE, { ...RECORD, listingId: 'listing-a' });
    await service.addRecord(CODE, RECORD);

    expect(db.records).toEqual([
      expect.objectContaining({ content: '현장 확인', kind: 'note', listingId: 'listing-a' }),
      expect.objectContaining({ content: '현장 확인', kind: 'note', listingId: null }),
    ]);
  });

  it('refuses a related listing that is not a meeting listing', async () => {
    const { db, service } = setup();

    await expect(
      service.addRecord(CODE, { ...RECORD, listingId: 'listing-b' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.records).toHaveLength(0);

    const edit = withRecord(null);
    await expect(
      edit.service.updateRecord(CODE, 'record-1', { ...RECORD, listingId: 'listing-b' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(edit.db.records[0]).toEqual(
      expect.objectContaining({ content: '처음 내용', listingId: null }),
    );
  });

  it('sets, keeps and clears the related listing when editing', async () => {
    const { db, service } = withRecord(null);

    await service.updateRecord(CODE, 'record-1', { ...RECORD, listingId: 'listing-a' });
    expect(db.records[0]).toEqual(
      expect.objectContaining({ content: '현장 확인', listingId: 'listing-a' }),
    );

    await service.updateRecord(CODE, 'record-1', { ...RECORD, content: '내용만 고침' });
    expect(db.records[0]).toEqual(
      expect.objectContaining({ content: '내용만 고침', listingId: 'listing-a' }),
    );

    await service.updateRecord(CODE, 'record-1', { ...RECORD, listingId: null });
    expect(db.records[0]).toEqual(expect.objectContaining({ listingId: null }));
  });

  it('keeps a related listing that was later removed from the meeting', async () => {
    const { db, service } = setup({
      records: [
        { content: '처음 내용', id: 'record-1', listingId: 'listing-b', meetingId: 'meeting-1' },
      ],
    });

    await service.updateRecord(CODE, 'record-1', { ...RECORD, listingId: 'listing-b' });

    expect(db.records[0]).toEqual(expect.objectContaining({ listingId: 'listing-b' }));
  });

  it('keeps record links when the listing is removed from the meeting', async () => {
    const { db, service } = withRecord('listing-a');

    await service.removeListing(CODE, 'listing-a');

    expect(db.links).toEqual([]);
    expect(db.records[0]).toEqual(expect.objectContaining({ listingId: 'listing-a' }));
  });

  it('returns 404 for a record of another meeting', async () => {
    await expect(setup().service.updateRecord(CODE, 'missing', RECORD)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('KkiruMeetingsService stop and resume', () => {
  it('stops a meeting with a reason and frees its listings', async () => {
    const { db, listing: listingOf, meeting, service } = setup();

    await service.stop(CODE, '고객 보류');

    expect(meeting('meeting-1')).toEqual(
      expect.objectContaining({ status: 'stopped', stoppedAt: expect.any(Date) }),
    );
    expect(db.records).toEqual([
      expect.objectContaining({ content: '고객 보류', kind: 'stopped', meetingId: 'meeting-1' }),
    ]);
    expect(listingOf('listing-a')?.status).toBe('available');
  });

  it('can stop after a cancelled contract', async () => {
    const { meeting, service } = setup({
      contracts: [
        { id: 'contract-1', listingId: 'listing-a', meetingId: 'meeting-1', status: 'cancelled' },
      ],
      meetingStatus: 'contract_cancelled',
    });

    await service.stop(CODE, '다른 곳 계약');

    expect(meeting('meeting-1')?.status).toBe('stopped');
  });

  it.each([
    'contracting',
    'contracted',
    'stopped',
  ])('refuses to stop a meeting in status %s', async (meetingStatus) => {
    const { db, service } = setup({ meetingStatus });

    await expect(service.stop(CODE, '사유')).rejects.toBeInstanceOf(ConflictException);
    expect(db.records).toHaveLength(0);
  });

  it('resumes a stopped meeting back to its contract status', async () => {
    const {
      db,
      listing: listingOf,
      meeting,
      service,
    } = setup({
      contracts: [
        { id: 'contract-1', listingId: 'listing-a', meetingId: 'meeting-1', status: 'cancelled' },
      ],
      listings: [listing('listing-a', 'available')],
      meetingStatus: 'stopped',
      stoppedAt: new Date('2026-11-20T00:00:00.000Z'),
    });

    await service.resume(CODE, '다시 찾기로 함');

    expect(meeting('meeting-1')).toEqual(
      expect.objectContaining({ status: 'contract_cancelled', stoppedAt: null }),
    );
    expect(db.records).toEqual([expect.objectContaining({ kind: 'resumed' })]);
    expect(listingOf('listing-a')?.status).toBe('meeting');
  });

  it('refuses to resume a meeting that is not stopped', async () => {
    await expect(setup().service.resume(CODE, '사유')).rejects.toBeInstanceOf(ConflictException);
  });
});
