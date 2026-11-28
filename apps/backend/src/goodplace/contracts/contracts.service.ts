import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_PAGE_SIZE, type Pagination, toPagination } from '../../common/page-size';
import { normalizeRandomCode } from '../../common/random-code';
import type { GoodplaceContractStatus, Prisma } from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { toDateOnly, toDateString, toSeoulDate } from '../common/goodplace-fields';
import { pickSearch, type SortOrder } from '../common/list-query';
import {
  CONTRACTABLE_MEETING_STATUSES,
  lockMeetingListings,
  lockRow,
  syncMeetingAndListings,
} from '../common/status-sync';
import { type ListingOption, toListingOption } from '../listings/listings.service';
import { type MeetingRecord, RECORD_INCLUDE, toMeetingRecord } from '../meetings/meetings.service';
import {
  BALANCE_DUE_BEFORE_CONTRACT_MESSAGE,
  type ContractFieldsDto,
  type ContractSearchField,
  type ContractSortField,
  type CreateContractDto,
  type ListContractsQueryDto,
} from './dto/contract.dto';

export type ContractSummary = {
  id: string;
  /** 케이스 번호 (미팅과 같다) */
  caseCode: string;
  contractedOn: string;
  customer: { code: string; name: string; phone: string };
  listing: { code: string; name: string };
  commission: number;
  /** 잔금(만원) */
  balance: number;
  /** 잔금일 (YYYY-MM-DD) */
  balanceDueOn: string;
  status: GoodplaceContractStatus;
};

export type ContractDetail = Omit<ContractSummary, 'listing'> & {
  meeting: { code: string; title: string };
  listing: ListingOption & { clientName: string; clientPhone: string };
  landlordName: string;
  landlordPhone: string;
  deposit: number;
  rent: number;
  premium: number;
  leaseStartOn: string;
  leaseEndOn: string;
  specialTerms: string | null;
  downPayment: number;
  isMyListing: boolean;
  isMyClient: boolean;
  cancelReason: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  /** 계약 히스토리: 이 계약이 속한 미팅의 로그 (날짜순) */
  history: MeetingRecord[];
  createdAt: string;
  updatedAt: string;
};

export type ContractListResponse = {
  items: ContractSummary[];
  pagination: Pagination;
};

const SUMMARY_INCLUDE = {
  listing: true,
  meeting: { include: { customer: true } },
} satisfies Prisma.GoodplaceContractInclude;

const DETAIL_INCLUDE = {
  listing: true,
  meeting: {
    include: {
      customer: true,
      records: {
        include: RECORD_INCLUDE,
        orderBy: [{ recordedOn: 'asc' as const }, { createdAt: 'asc' as const }],
      },
    },
  },
} satisfies Prisma.GoodplaceContractInclude;

type ContractWithSummary = Prisma.GoodplaceContractGetPayload<{ include: typeof SUMMARY_INCLUDE }>;
type ContractWithDetail = Prisma.GoodplaceContractGetPayload<{ include: typeof DETAIL_INCLUDE }>;

function toSummary(contract: ContractWithSummary): ContractSummary {
  const { listing, meeting } = contract;

  return {
    balance: contract.balance,
    balanceDueOn: toDateString(contract.balanceDueOn),
    caseCode: meeting.code,
    commission: contract.commission,
    contractedOn: toDateString(contract.contractedOn),
    customer: {
      code: meeting.customer.code,
      name: meeting.customer.name,
      phone: meeting.customer.phone,
    },
    id: contract.id,
    listing: { code: listing.code, name: listing.name },
    status: contract.status,
  };
}

function toDetail(contract: ContractWithDetail): ContractDetail {
  const { listing, meeting } = contract;

  return {
    ...toSummary(contract),
    cancelReason: contract.cancelReason,
    cancelledAt: contract.cancelledAt?.toISOString() ?? null,
    completedAt: contract.completedAt?.toISOString() ?? null,
    createdAt: contract.createdAt.toISOString(),
    deposit: contract.deposit,
    downPayment: contract.downPayment,
    history: meeting.records.map(toMeetingRecord),
    isMyClient: contract.isMyClient,
    isMyListing: contract.isMyListing,
    landlordName: contract.landlordName,
    landlordPhone: contract.landlordPhone,
    leaseEndOn: toDateString(contract.leaseEndOn),
    leaseStartOn: toDateString(contract.leaseStartOn),
    listing: {
      ...toListingOption(listing),
      clientName: listing.clientName,
      clientPhone: listing.clientPhone,
    },
    meeting: { code: meeting.code, title: meeting.title },
    premium: contract.premium,
    rent: contract.rent,
    specialTerms: contract.specialTerms,
    updatedAt: contract.updatedAt.toISOString(),
  };
}

/** 케이스 번호·임차인·매물 이름·임대인으로 찾는다. field로 한 항목만 고를 수 있다. */
export function buildContractSearch(
  query: string,
  field: ContractSearchField = 'all',
): Prisma.GoodplaceContractWhereInput {
  if (!query) {
    return {};
  }

  const contains = { contains: query, mode: 'insensitive' as const };
  const code = normalizeRandomCode(query);

  return pickSearch<Prisma.GoodplaceContractWhereInput>(
    {
      caseCode: code ? { meeting: { code: { contains: code } } } : null,
      customer: { meeting: { customer: { name: contains } } },
      landlord: { landlordName: contains },
      listing: { listing: { name: contains } },
    },
    field,
  );
}

const CONTRACT_ORDER_BY: Record<
  ContractSortField,
  (order: SortOrder) => Prisma.GoodplaceContractOrderByWithRelationInput
> = {
  balance: (order) => ({ balance: order }),
  balanceDueOn: (order) => ({ balanceDueOn: order }),
  commission: (order) => ({ commission: order }),
  contractedOn: (order) => ({ contractedOn: order }),
  customer: (order) => ({ meeting: { customer: { name: order } } }),
  listing: (order) => ({ listing: { name: order } }),
  status: (order) => ({ status: order }),
};

function contractNotFound() {
  return new NotFoundException('Contract not found');
}

/** 계약 항목을 저장할 값으로 바꾼다. 임대인이 의뢰인과 같으면 의뢰인 값을 복사한다. */
function toFieldData(
  input: ContractFieldsDto,
  client: { clientName: string; clientPhone: string },
) {
  if (input.leaseEndOn < input.leaseStartOn) {
    throw new BadRequestException('leaseEndOn must not be before leaseStartOn');
  }

  // DTO에서도 막지만 서비스를 직접 부르는 경우를 위해 한 번 더 확인한다.
  if (input.balanceDueOn < input.contractedOn) {
    throw new BadRequestException(BALANCE_DUE_BEFORE_CONTRACT_MESSAGE);
  }

  return {
    balance: input.balance,
    balanceDueOn: toDateOnly(input.balanceDueOn),
    commission: input.commission,
    contractedOn: toDateOnly(input.contractedOn),
    deposit: input.deposit,
    downPayment: input.downPayment,
    isMyClient: input.isMyClient,
    isMyListing: input.isMyListing,
    landlordName: input.landlordSameAsClient ? client.clientName : (input.landlordName as string),
    landlordPhone: input.landlordSameAsClient
      ? client.clientPhone
      : (input.landlordPhone as string),
    leaseEndOn: toDateOnly(input.leaseEndOn),
    leaseStartOn: toDateOnly(input.leaseStartOn),
    premium: input.premium,
    rent: input.rent,
    specialTerms: input.specialTerms ?? null,
  };
}

@Injectable()
export class GoodplaceContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    size = DEFAULT_PAGE_SIZE,
    q = '',
    sort = 'contractedOn',
    status,
  }: ListContractsQueryDto = {}): Promise<ContractListResponse> {
    const where = { ...buildContractSearch(q, field), ...(status ? { status } : {}) };
    const [total, contracts] = await this.prisma.$transaction([
      this.prisma.goodplaceContract.count({ where }),
      this.prisma.goodplaceContract.findMany({
        include: SUMMARY_INCLUDE,
        orderBy: [CONTRACT_ORDER_BY[sort](order), { contractedOn: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * size,
        take: size,
        where,
      }),
    ]);

    return { items: contracts.map(toSummary), pagination: toPagination(page, size, total) };
  }

  async findById(id: string): Promise<ContractDetail> {
    const contract = await this.prisma.goodplaceContract.findUnique({
      include: DETAIL_INCLUDE,
      where: { id },
    });

    if (!contract) {
      throw contractNotFound();
    }

    return toDetail(contract);
  }

  /**
   * 계약 진행: 미팅에서 매물 하나를 골라 계약을 만든다.
   * 미팅이 미팅중·계약취소 상태여야 하고, 미팅에 계약중·계약완료 계약이 없어야 하며,
   * 매물이 계약중·계약완료가 아니어야 한다. 미팅 매물에 없던 매물이면 함께 더한다.
   */
  async create(input: CreateContractDto): Promise<ContractDetail> {
    const meetingCode = normalizeRandomCode(input.meetingCode);
    const meeting = meetingCode
      ? await this.prisma.goodplaceMeeting.findUnique({
          select: { id: true },
          where: { code: meetingCode },
        })
      : null;

    if (!meeting) {
      throw new BadRequestException('Unknown meeting');
    }

    const id = await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'meetings', meeting.id);
      const locked = await tx.goodplaceMeeting.findUniqueOrThrow({
        select: { status: true },
        where: { id: meeting.id },
      });

      if (!CONTRACTABLE_MEETING_STATUSES.includes(locked.status)) {
        throw new ConflictException(`Meeting status ${locked.status} cannot start a contract`);
      }

      // 한 미팅에 계약중 계약은 하나뿐이고, 계약완료된 계약이 있으면 새 계약을 만들지 않는다.
      const activeCount = await tx.goodplaceContract.count({
        where: { meetingId: meeting.id, status: { in: ['contracting', 'completed'] } },
      });

      if (activeCount > 0) {
        throw new ConflictException('Meeting already has a contract in progress or completed');
      }

      const listing = await tx.goodplaceListing.findUnique({
        select: { id: true },
        where: { id: input.listingId },
      });

      if (!listing) {
        throw new BadRequestException('Unknown listing');
      }

      // 한 매물에 진행 중인 계약은 하나뿐이다. 매물 행을 잠그고 다시 읽어 동시에 두 계약이 생기지 않게 한다.
      await lockMeetingListings(tx, meeting.id, [listing.id]);
      const target = await tx.goodplaceListing.findUniqueOrThrow({ where: { id: listing.id } });

      if (target.status === 'contracted' || target.status === 'contracting') {
        throw new ConflictException(`Listing status ${target.status} cannot start a contract`);
      }

      const link = await tx.goodplaceMeetingListing.findUnique({
        select: { listingId: true },
        // biome-ignore lint/style/useNamingConvention: Prisma compound key name.
        where: { meetingId_listingId: { listingId: target.id, meetingId: meeting.id } },
      });

      if (!link) {
        await tx.goodplaceMeetingListing.create({
          data: { listingId: target.id, meetingId: meeting.id },
        });
      }

      const contract = await tx.goodplaceContract.create({
        data: { ...toFieldData(input, target), listingId: target.id, meetingId: meeting.id },
      });
      await syncMeetingAndListings(tx, meeting.id);

      return contract.id;
    });

    return this.findById(id);
  }

  /** 계약중인 계약만 고칠 수 있다. */
  async update(id: string, input: ContractFieldsDto): Promise<ContractDetail> {
    await this.prisma.$transaction(async (tx) => {
      const contract = await this.lockContract(tx, id);

      if (contract.status !== 'contracting') {
        throw new ConflictException('Only a contract in progress can be edited');
      }

      await tx.goodplaceContract.update({
        data: toFieldData(input, contract.listing),
        where: { id },
      });
    });

    return this.findById(id);
  }

  /** 계약완료: 계약을 계약완료로 바꾸고 미팅·매물 상태를 다시 맞춘다. */
  async complete(id: string): Promise<ContractDetail> {
    await this.prisma.$transaction(async (tx) => {
      const contract = await this.requireContracting(tx, id);

      await tx.goodplaceContract.update({
        data: { completedAt: new Date(), status: 'completed' },
        where: { id },
      });
      await syncMeetingAndListings(tx, contract.meetingId);
    });

    return this.findById(id);
  }

  /** 계약취소: 사유를 계약과 미팅 로그에 남기고 미팅·매물 상태를 다시 맞춘다. 같은 미팅에서 새 계약을 만들 수 있다. */
  async cancel(id: string, reason: string): Promise<ContractDetail> {
    await this.prisma.$transaction(async (tx) => {
      const contract = await this.requireContracting(tx, id);

      await tx.goodplaceContract.update({
        data: { cancelReason: reason, cancelledAt: new Date(), status: 'cancelled' },
        where: { id },
      });
      await tx.goodplaceMeetingRecord.create({
        data: {
          content: reason,
          kind: 'contract_cancelled',
          meetingId: contract.meetingId,
          recordedOn: toSeoulDate(new Date()),
        },
      });
      await syncMeetingAndListings(tx, contract.meetingId);
    });

    return this.findById(id);
  }

  private async requireContracting(tx: Prisma.TransactionClient, id: string) {
    const contract = await this.lockContract(tx, id);

    if (contract.status !== 'contracting') {
      throw new ConflictException(`Contract status must be contracting but is ${contract.status}`);
    }

    return contract;
  }

  /** 미팅 → 계약 순서로 잠근다. */
  private async lockContract(tx: Prisma.TransactionClient, id: string) {
    const found = await tx.goodplaceContract.findUnique({
      select: { meetingId: true },
      where: { id },
    });

    if (!found) {
      throw contractNotFound();
    }

    await lockRow(tx, 'meetings', found.meetingId);
    await lockRow(tx, 'contracts', id);

    return tx.goodplaceContract.findUniqueOrThrow({ include: { listing: true }, where: { id } });
  }
}
