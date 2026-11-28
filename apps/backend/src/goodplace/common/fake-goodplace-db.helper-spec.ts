// 굿플레이스 서비스 테스트용 메모리 DB. 서비스가 트랜잭션 안에서 쓰는 Prisma 호출만 흉내 낸다.
// 파일 이름이 '-spec.ts'로 끝나 빌드(**/*spec.ts 제외)와 jest(.spec.ts) 둘 다에서 빠진다.
import type { PrismaService } from '../../prisma/prisma.service';

type Row = Record<string, unknown>;

export type FakeMeeting = { id: string; code: string; status: string; stoppedAt: Date | null };
export type FakeListing = {
  id: string;
  status: string;
  clientName: string;
  clientPhone: string;
};
export type FakeContract = { id: string; meetingId: string; listingId: string; status: string };
export type FakeLink = { meetingId: string; listingId: string };
export type FakeRecord = {
  id: string;
  meetingId: string;
  content: string;
  listingId: string | null;
};

type Where = Record<string, unknown>;

function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (condition && typeof condition === 'object' && 'in' in condition) {
      return (condition as { in: unknown[] }).in.includes(row[key]);
    }

    return row[key] === condition;
  });
}

export function createFakeGoodplaceDb(seed: {
  meetings?: FakeMeeting[];
  listings?: FakeListing[];
  contracts?: FakeContract[];
  links?: FakeLink[];
  records?: FakeRecord[];
}) {
  const db = {
    contracts: (seed.contracts ?? []).map((row) => ({ ...row })) as (FakeContract & Row)[],
    links: (seed.links ?? []).map((row) => ({ ...row })) as (FakeLink & Row)[],
    listings: (seed.listings ?? []).map((row) => ({ ...row })) as (FakeListing & Row)[],
    locks: [] as string[],
    meetings: (seed.meetings ?? []).map((row) => ({ ...row })) as (FakeMeeting & Row)[],
    records: (seed.records ?? []).map((row) => ({ ...row })) as Row[],
  };

  const meetingById = (id: string) => db.meetings.find((meeting) => meeting.id === id);
  const listingById = (id: string) => db.listings.find((listing) => listing.id === id);

  const tx = {
    $executeRawUnsafe: jest.fn((sql: string, id: string) => {
      const table = /"goodplace"\."(\w+)"/.exec(sql)?.[1];
      db.locks.push(`${table}:${id}`);
      return Promise.resolve(1);
    }),
    goodplaceContract: {
      count: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(db.contracts.filter((row) => matches(row, where)).length),
      ),
      create: jest.fn(({ data }: { data: Row }) => {
        const contract = {
          ...data,
          id: `contract-${db.contracts.length + 1}`,
          status: 'contracting',
        } as FakeContract & Row;
        db.contracts.push(contract);
        return Promise.resolve(contract);
      }),
      findMany: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(db.contracts.filter((row) => matches(row, where))),
      ),
      findUnique: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(db.contracts.find((row) => matches(row, where)) ?? null),
      ),
      findUniqueOrThrow: jest.fn(({ where }: { where: Where }) => {
        const contract = db.contracts.find((row) => matches(row, where));
        return contract
          ? Promise.resolve({ ...contract, listing: listingById(contract.listingId) })
          : Promise.reject(new Error('not found'));
      }),
      update: jest.fn(({ data, where }: { data: Row; where: Where }) => {
        const contract = db.contracts.find((row) => matches(row, where));
        Object.assign(contract ?? {}, data);
        return Promise.resolve(contract);
      }),
    },
    goodplaceListing: {
      findUnique: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(db.listings.find((row) => matches(row, where)) ?? null),
      ),
      findUniqueOrThrow: jest.fn(({ where }: { where: Where }) => {
        const listing = db.listings.find((row) => matches(row, where));
        return listing ? Promise.resolve(listing) : Promise.reject(new Error('not found'));
      }),
      update: jest.fn(({ data, where }: { data: Row; where: Where }) => {
        const listing = db.listings.find((row) => matches(row, where));
        Object.assign(listing ?? {}, data);
        return Promise.resolve(listing);
      }),
    },
    goodplaceMeeting: {
      findUnique: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(db.meetings.find((row) => matches(row, where)) ?? null),
      ),
      findUniqueOrThrow: jest.fn(({ where }: { where: Where }) => {
        const meeting = db.meetings.find((row) => matches(row, where));
        return meeting
          ? Promise.resolve({
              ...meeting,
              contracts: db.contracts.filter((contract) => contract.meetingId === meeting.id),
            })
          : Promise.reject(new Error('not found'));
      }),
      update: jest.fn(({ data, where }: { data: Row; where: Where }) => {
        const meeting = db.meetings.find((row) => matches(row, where));
        Object.assign(meeting ?? {}, data);
        return Promise.resolve(meeting);
      }),
    },
    goodplaceMeetingListing: {
      create: jest.fn(({ data }: { data: FakeLink }) => {
        db.links.push({ ...data });
        return Promise.resolve(data);
      }),
      deleteMany: jest.fn(({ where }: { where: Where }) => {
        const before = db.links.length;
        db.links = db.links.filter((row) => !matches(row, where));
        return Promise.resolve({ count: before - db.links.length });
      }),
      findMany: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(
          db.links
            .filter((row) => matches(row, where))
            .map((link) => ({ ...link, meeting: meetingById(link.meetingId) })),
        ),
      ),
      // biome-ignore lint/style/useNamingConvention: Prisma compound key name.
      findUnique: jest.fn(({ where }: { where: { meetingId_listingId: FakeLink } }) =>
        Promise.resolve(
          db.links.find((row) => matches(row, { ...where.meetingId_listingId })) ?? null,
        ),
      ),
    },
    goodplaceMeetingRecord: {
      create: jest.fn(({ data }: { data: Row }) => {
        db.records.push(data);
        return Promise.resolve(data);
      }),
      findFirst: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(db.records.find((row) => matches(row, where)) ?? null),
      ),
      update: jest.fn(({ data, where }: { data: Row; where: Where }) => {
        const record = db.records.find((row) => matches(row, where));
        Object.assign(record ?? {}, data);
        return Promise.resolve(record);
      }),
    },
  };

  const prisma = {
    ...tx,
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  } as unknown as PrismaService;

  return {
    db,
    listing: (id: string) => listingById(id),
    meeting: (id: string) => meetingById(id),
    prisma,
    tx,
  };
}
