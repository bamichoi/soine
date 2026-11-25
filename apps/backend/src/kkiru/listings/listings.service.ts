import { Injectable, NotFoundException } from '@nestjs/common';
import { generateRandomCode, normalizeRandomCode } from '../../common/random-code';
import { type KkiruListing, type KkiruListingStatus, Prisma } from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { KKIRU_PAGE_SIZE, toPagination } from '../common/kkiru-fields';
import type { ListingDto, ListingOptionsQueryDto, ListListingsQueryDto } from './dto/listing.dto';

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

/** 매물 이름·주소·번호로 찾는다. */
export function buildListingSearch(query: string): Prisma.KkiruListingWhereInput {
  if (!query) {
    return {};
  }

  const code = normalizeRandomCode(query);
  const conditions: Prisma.KkiruListingWhereInput[] = [
    { name: { contains: query, mode: 'insensitive' } },
    { address: { contains: query, mode: 'insensitive' } },
  ];

  if (code) {
    conditions.push({ code: { contains: code } });
  }

  // biome-ignore lint/style/useNamingConvention: Prisma filter operator.
  return { OR: conditions };
}

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
    page = 1,
    q = '',
    status,
  }: ListListingsQueryDto = {}): Promise<ListingListResponse> {
    const where = { ...buildListingSearch(q), ...(status ? { status } : {}) };
    const [total, listings] = await this.prisma.$transaction([
      this.prisma.kkiruListing.count({ where }),
      this.prisma.kkiruListing.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * KKIRU_PAGE_SIZE,
        take: KKIRU_PAGE_SIZE,
        where,
      }),
    ]);

    return { items: listings.map(toListing), pagination: toPagination(page, total) };
  }

  /** 상담매물·미팅 대상으로 고를 수 있는(계약가능) 매물 검색 */
  async options({ limit = 20, q = '' }: ListingOptionsQueryDto = {}): Promise<ListingOption[]> {
    const listings = await this.prisma.kkiruListing.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      where: { ...buildListingSearch(q), status: 'available' },
    });

    return listings.map(toListingOption);
  }

  async findByCode(rawCode: string): Promise<Listing> {
    const code = normalizeRandomCode(rawCode);
    const listing = code ? await this.prisma.kkiruListing.findUnique({ where: { code } }) : null;

    if (!listing) {
      throw listingNotFound();
    }

    return toListing(listing);
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

  async update(rawCode: string, input: ListingDto): Promise<Listing> {
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
