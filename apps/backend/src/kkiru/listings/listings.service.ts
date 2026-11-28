import { Injectable, NotFoundException } from '@nestjs/common';
import { generateRandomCode, normalizeRandomCode } from '../../common/random-code';
import {
  type KkiruContractStatus,
  type KkiruListing,
  type KkiruListingStatus,
  type KkiruMeetingStatus,
  Prisma,
} from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { KKIRU_PAGE_SIZE, toDateString, toPagination } from '../common/kkiru-fields';
import { pickSearch, type SortOrder } from '../common/list-query';
import type {
  ListingDto,
  ListingOptionsQueryDto,
  ListingSearchField,
  ListingSortField,
  ListListingsQueryDto,
} from './dto/listing.dto';

const CODE_GENERATION_ATTEMPTS = 5;

export type Listing = {
  id: string;
  code: string;
  name: string;
  address: string;
  areaM2: number;
  floor: string;
  rent: number;
  deposit: number;
  premium: number;
  hasParking: boolean | null;
  restroomCount: number | null;
  features: string | null;
  clientName: string;
  clientPhone: string;
  status: KkiruListingStatus;
  createdAt: string;
  updatedAt: string;
};

/** 매물을 고를 때 보여 주는 짧은 항목 */
export type ListingOption = Pick<
  Listing,
  | 'id'
  | 'code'
  | 'name'
  | 'address'
  | 'areaM2'
  | 'floor'
  | 'rent'
  | 'deposit'
  | 'premium'
  | 'status'
>;

/** 이 매물이 미팅 매물로 걸린 미팅 한 건. contract는 이 미팅에서 이 매물로 맺은 가장 최근 계약 */
export type ListingMeeting = {
  code: string;
  title: string;
  customer: { name: string };
  meetAt: string;
  status: KkiruMeetingStatus;
  contract: { id: string; status: KkiruContractStatus; contractedOn: string } | null;
};

/** 매물 상세: 매물 + 이 매물로 한 미팅 내역(최근 미팅 먼저, 계약취소 포함) */
export type ListingDetail = Listing & { meetings: ListingMeeting[] };

export type ListingListResponse = {
  items: Listing[];
  pagination: ReturnType<typeof toPagination>;
};

export function toListing(listing: KkiruListing): Listing {
  return {
    address: listing.address,
    areaM2: listing.areaM2.toNumber(),
    clientName: listing.clientName,
    clientPhone: listing.clientPhone,
    code: listing.code,
    createdAt: listing.createdAt.toISOString(),
    deposit: listing.deposit,
    features: listing.features,
    floor: listing.floor,
    hasParking: listing.hasParking,
    id: listing.id,
    name: listing.name,
    premium: listing.premium,
    rent: listing.rent,
    restroomCount: listing.restroomCount,
    status: listing.status,
    updatedAt: listing.updatedAt.toISOString(),
  };
}

export function toListingOption(listing: KkiruListing): ListingOption {
  const { address, areaM2, code, deposit, floor, id, name, premium, rent, status } =
    toListing(listing);
  return { address, areaM2, code, deposit, floor, id, name, premium, rent, status };
}

/** 매물 번호·이름·주소·의뢰인(이름·연락처)으로 찾는다. field로 한 항목만 고를 수 있다. */
export function buildListingSearch(
  query: string,
  field: ListingSearchField = 'all',
): Prisma.KkiruListingWhereInput {
  if (!query) {
    return {};
  }

  const contains = { contains: query, mode: 'insensitive' as const };
  const code = normalizeRandomCode(query);
  const digits = query.replace(/\D/g, '');
  const clientByName: Prisma.KkiruListingWhereInput = { clientName: contains };

  return pickSearch<Prisma.KkiruListingWhereInput>(
    {
      address: { address: contains },
      client:
        digits.length >= 3
          ? // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
            { OR: [clientByName, { clientPhone: { contains: digits } }] }
          : clientByName,
      code: code ? { code: { contains: code } } : null,
      name: { name: contains },
    },
    field,
  );
}

const LISTING_ORDER_BY: Record<
  ListingSortField,
  (order: SortOrder) => Prisma.KkiruListingOrderByWithRelationInput
> = {
  address: (order) => ({ address: order }),
  areaM2: (order) => ({ areaM2: order }),
  createdAt: (order) => ({ createdAt: order }),
  deposit: (order) => ({ deposit: order }),
  floor: (order) => ({ floor: order }),
  name: (order) => ({ name: order }),
  premium: (order) => ({ premium: order }),
  status: (order) => ({ status: order }),
};

function toData(input: ListingDto) {
  return {
    address: input.address,
    areaM2: new Prisma.Decimal(input.areaM2),
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    deposit: input.deposit,
    features: input.features ?? null,
    floor: input.floor,
    hasParking: input.hasParking ?? null,
    name: input.name,
    premium: input.premium,
    rent: input.rent,
    restroomCount: input.restroomCount ?? null,
  };
}

function listingNotFound() {
  return new NotFoundException('Listing not found');
}

function isUniqueCodeViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes('code')
  );
}

@Injectable()
export class KkiruListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    q = '',
    sort = 'createdAt',
    status,
  }: ListListingsQueryDto = {}): Promise<ListingListResponse> {
    const where = { ...buildListingSearch(q, field), ...(status ? { status } : {}) };
    const [total, listings] = await this.prisma.$transaction([
      this.prisma.kkiruListing.count({ where }),
      this.prisma.kkiruListing.findMany({
        orderBy: [LISTING_ORDER_BY[sort](order), { createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * KKIRU_PAGE_SIZE,
        take: KKIRU_PAGE_SIZE,
        where,
      }),
    ]);

    return { items: listings.map(toListing), pagination: toPagination(page, total) };
  }

  /** 미팅 매물·계약 대상으로 고를 수 있는(계약완료가 아닌) 매물 검색 */
  async options({ limit = 20, q = '' }: ListingOptionsQueryDto = {}): Promise<ListingOption[]> {
    const listings = await this.prisma.kkiruListing.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      where: { ...buildListingSearch(q), status: { not: 'contracted' } },
    });

    return listings.map(toListingOption);
  }

  async findByCode(rawCode: string): Promise<ListingDetail> {
    const code = normalizeRandomCode(rawCode);
    const listing = code ? await this.prisma.kkiruListing.findUnique({ where: { code } }) : null;

    if (!listing) {
      throw listingNotFound();
    }

    const links = await this.prisma.kkiruMeetingListing.findMany({
      orderBy: [{ meeting: { meetAt: 'desc' } }, { meeting: { createdAt: 'desc' } }],
      select: {
        meeting: {
          select: {
            code: true,
            contracts: {
              orderBy: [{ createdAt: 'desc' }],
              select: { contractedOn: true, id: true, status: true },
              take: 1,
              where: { listingId: listing.id },
            },
            customer: { select: { name: true } },
            meetAt: true,
            status: true,
            title: true,
          },
        },
      },
      where: { listingId: listing.id },
    });

    return {
      ...toListing(listing),
      meetings: links.map(({ meeting }) => {
        const contract = meeting.contracts[0];

        return {
          code: meeting.code,
          contract: contract
            ? {
                contractedOn: toDateString(contract.contractedOn),
                id: contract.id,
                status: contract.status,
              }
            : null,
          customer: { name: meeting.customer.name },
          meetAt: meeting.meetAt.toISOString(),
          status: meeting.status,
          title: meeting.title,
        };
      }),
    };
  }

  async create(input: ListingDto): Promise<Listing> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const listing = await this.prisma.kkiruListing.create({
          data: { ...toData(input), code: generateRandomCode() },
        });

        return toListing(listing);
      } catch (error) {
        if (!isUniqueCodeViolation(error) || attempt >= CODE_GENERATION_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  async update(rawCode: string, input: ListingDto): Promise<ListingDetail> {
    const code = normalizeRandomCode(rawCode);
    const { count } = code
      ? await this.prisma.kkiruListing.updateMany({ data: toData(input), where: { code } })
      : { count: 0 };

    if (count === 0) {
      throw listingNotFound();
    }

    return this.findByCode(code as string);
  }
}
