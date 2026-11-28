import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeRandomCode } from '../../common/random-code';
import type {
  KkiruContractStatus,
  KkiruMeetingRecordKind,
  Prisma,
} from '../../generated/prisma/client';
// biome-ignore lint/style/useImportType: NestJS needs the runtime value for dependency injection metadata.
import { PrismaService } from '../../prisma/prisma.service';
import { KKIRU_PAGE_SIZE, toDateOnly, toDateString, toPagination } from '../common/kkiru-fields';
import { pickSearch, type SortOrder } from '../common/list-query';
import { lockRow, syncConsultationStatus, syncListingStatus } from '../common/status-sync';
import { type ListingOption, toListingOption } from '../listings/listings.service';
import { CONTRACTABLE_MEETING_STATUSES, toSeoulDate } from '../meetings/meetings.service';
import type {
  ContractFieldsDto,
  ContractSearchField,
  ContractSortField,
  CreateContractDto,
  ListContractsQueryDto,
} from './dto/contract.dto';

export type ContractSummary = {
  id: string;
  /** 케이스 번호 (상담과 같다) */
  caseCode: string;
  contractedOn: string;
  customer: { code: string; name: string; phone: string };
  listing: { code: string; name: string };
  commission: number;
  status: KkiruContractStatus;
};

/** 계약 히스토리 한 줄: 상담 로그 또는 미팅 로그 */
export type ContractHistoryEntry = {
  id: string;
  source: 'consultation' | 'meeting';
  kind: KkiruMeetingRecordKind | 'note';
  recordedOn: string;
  content: string;
};

export type ContractDetail = Omit<ContractSummary, 'listing'> & {
  consultation: { code: string; title: string };
  meetingId: string;
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
  /** 상담 로그와 이 미팅의 로그를 날짜순으로 합친 것 */
  history: ContractHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type ContractListResponse = {
  items: ContractSummary[];
  pagination: ReturnType<typeof toPagination>;
};

const SUMMARY_INCLUDE = {
  meeting: { include: { consultation: { include: { customer: true } }, listing: true } },
} satisfies Prisma.KkiruContractInclude;

const RECORD_ORDER = [{ recordedOn: 'asc' as const }, { createdAt: 'asc' as const }];

const DETAIL_INCLUDE = {
  meeting: {
    include: {
      consultation: { include: { customer: true, records: { orderBy: RECORD_ORDER } } },
      listing: true,
      records: { orderBy: RECORD_ORDER },
    },
  },
} satisfies Prisma.KkiruContractInclude;

type ContractWithSummary = Prisma.KkiruContractGetPayload<{ include: typeof SUMMARY_INCLUDE }>;
type ContractWithDetail = Prisma.KkiruContractGetPayload<{ include: typeof DETAIL_INCLUDE }>;

function toSummary(contract: ContractWithSummary): ContractSummary {
  const { consultation, listing } = contract.meeting;

  return {
    caseCode: consultation.code,
    commission: contract.commission,
    contractedOn: toDateString(contract.contractedOn),
    customer: {
      code: consultation.customer.code,
      name: consultation.customer.name,
      phone: consultation.customer.phone,
    },
    id: contract.id,
    listing: { code: listing.code, name: listing.name },
    status: contract.status,
  };
}

type HistorySource = {
  id: string;
  recordedOn: Date;
  createdAt: Date;
  content: string;
  kind?: KkiruMeetingRecordKind;
};

export function mergeHistory(
  consultationRecords: HistorySource[],
  meetingRecords: HistorySource[],
): ContractHistoryEntry[] {
  const entries = [
    ...consultationRecords.map((record) => ({ record, source: 'consultation' as const })),
    ...meetingRecords.map((record) => ({ record, source: 'meeting' as const })),
  ];

  return entries
    .sort(
      (a, b) =>
        a.record.recordedOn.getTime() - b.record.recordedOn.getTime() ||
        a.record.createdAt.getTime() - b.record.createdAt.getTime(),
    )
    .map(({ record, source }) => ({
      content: record.content,
      id: record.id,
      kind: record.kind ?? 'note',
      recordedOn: toDateString(record.recordedOn),
      source,
    }));
}

function toDetail(contract: ContractWithDetail): ContractDetail {
  const { meeting } = contract;

  return {
    ...toSummary(contract),
    cancelReason: contract.cancelReason,
    cancelledAt: contract.cancelledAt?.toISOString() ?? null,
    completedAt: contract.completedAt?.toISOString() ?? null,
    consultation: { code: meeting.consultation.code, title: meeting.consultation.title },
    createdAt: contract.createdAt.toISOString(),
    deposit: contract.deposit,
    downPayment: contract.downPayment,
    history: mergeHistory(meeting.consultation.records, meeting.records),
    isMyClient: contract.isMyClient,
    isMyListing: contract.isMyListing,
    landlordName: contract.landlordName,
    landlordPhone: contract.landlordPhone,
    leaseEndOn: toDateString(contract.leaseEndOn),
    leaseStartOn: toDateString(contract.leaseStartOn),
    listing: {
      ...toListingOption(meeting.listing),
      clientName: meeting.listing.clientName,
      clientPhone: meeting.listing.clientPhone,
    },
    meetingId: meeting.id,
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
): Prisma.KkiruContractWhereInput {
  if (!query) {
    return {};
  }

  const contains = { contains: query, mode: 'insensitive' as const };
  const code = normalizeRandomCode(query);

  return pickSearch<Prisma.KkiruContractWhereInput>(
    {
      caseCode: code ? { meeting: { consultation: { code: { contains: code } } } } : null,
      customer: { meeting: { consultation: { customer: { name: contains } } } },
      landlord: { landlordName: contains },
      listing: { meeting: { listing: { name: contains } } },
    },
    field,
  );
}

const CONTRACT_ORDER_BY: Record<
  ContractSortField,
  (order: SortOrder) => Prisma.KkiruContractOrderByWithRelationInput
> = {
  commission: (order) => ({ commission: order }),
  contractedOn: (order) => ({ contractedOn: order }),
  customer: (order) => ({ meeting: { consultation: { customer: { name: order } } } }),
  listing: (order) => ({ meeting: { listing: { name: order } } }),
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

  return {
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
export class KkiruContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({
    field = 'all',
    order = 'desc',
    page = 1,
    q = '',
    sort = 'contractedOn',
    status,
  }: ListContractsQueryDto = {}): Promise<ContractListResponse> {
    const where = { ...buildContractSearch(q, field), ...(status ? { status } : {}) };
    const [total, contracts] = await this.prisma.$transaction([
      this.prisma.kkiruContract.count({ where }),
      this.prisma.kkiruContract.findMany({
        include: SUMMARY_INCLUDE,
        orderBy: [CONTRACT_ORDER_BY[sort](order), { contractedOn: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * KKIRU_PAGE_SIZE,
        take: KKIRU_PAGE_SIZE,
        where,
      }),
    ]);

    return { items: contracts.map(toSummary), pagination: toPagination(page, total) };
  }

  async findById(id: string): Promise<ContractDetail> {
    const contract = await this.prisma.kkiruContract.findUnique({
      include: DETAIL_INCLUDE,
      where: { id },
    });

    if (!contract) {
      throw contractNotFound();
    }

    return toDetail(contract);
  }

  /** 계약진행: 미팅중이거나 계약이 취소된 미팅에서 계약을 만들고, 미팅·상담을 계약중으로 바꾼다. */
  async create(input: CreateContractDto): Promise<ContractDetail> {
    const id = await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.kkiruMeeting.findUnique({
        include: { listing: true },
        where: { id: input.meetingId },
      });

      if (!meeting) {
        throw new BadRequestException('Unknown meeting');
      }

      await lockRow(tx, 'consultations', meeting.consultationId);
      await lockRow(tx, 'meetings', meeting.id);
      const locked = await tx.kkiruMeeting.findUniqueOrThrow({
        select: { status: true },
        where: { id: meeting.id },
      });

      if (!CONTRACTABLE_MEETING_STATUSES.includes(locked.status)) {
        throw new ConflictException(`Meeting status ${locked.status} cannot start a contract`);
      }

      // 한 매물에 진행 중인 계약은 하나뿐이다. 매물 행을 잠그고 다시 읽어 동시에 두 계약이 생기지 않게 한다.
      await lockRow(tx, 'listings', meeting.listingId);
      const listing = await tx.kkiruListing.findUniqueOrThrow({
        select: { status: true },
        where: { id: meeting.listingId },
      });

      if (listing.status === 'contracted' || listing.status === 'contracting') {
        throw new ConflictException(`Listing status ${listing.status} cannot start a contract`);
      }

      const contract = await tx.kkiruContract.create({
        data: { ...toFieldData(input, meeting.listing), meetingId: meeting.id },
      });
      await tx.kkiruMeeting.update({ data: { status: 'contracting' }, where: { id: meeting.id } });
      await syncConsultationStatus(tx, meeting.consultationId);
      await syncListingStatus(tx, meeting.listingId);

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

      await tx.kkiruContract.update({
        data: toFieldData(input, contract.meeting.listing),
        where: { id },
      });
    });

    return this.findById(id);
  }

  /** 계약완료: 계약·미팅·상담을 계약완료로, 매물을 계약완료로 바꾼다. */
  async complete(id: string): Promise<ContractDetail> {
    await this.prisma.$transaction(async (tx) => {
      const contract = await this.requireContracting(tx, id);

      await tx.kkiruContract.update({
        data: { completedAt: new Date(), status: 'completed' },
        where: { id },
      });
      await tx.kkiruMeeting.update({
        data: { status: 'contracted' },
        where: { id: contract.meetingId },
      });
      await syncConsultationStatus(tx, contract.meeting.consultationId);
      await syncListingStatus(tx, contract.meeting.listingId);
    });

    return this.findById(id);
  }

  /** 계약취소: 사유를 남기고 계약·미팅을 계약취소로 바꾼다. 같은 미팅에서 새 계약을 만들 수 있다. */
  async cancel(id: string, reason: string): Promise<ContractDetail> {
    await this.prisma.$transaction(async (tx) => {
      const contract = await this.requireContracting(tx, id);

      await tx.kkiruContract.update({
        data: { cancelReason: reason, cancelledAt: new Date(), status: 'cancelled' },
        where: { id },
      });
      await tx.kkiruMeeting.update({
        data: { status: 'contract_cancelled' },
        where: { id: contract.meetingId },
      });
      await tx.kkiruMeetingRecord.create({
        data: {
          content: reason,
          kind: 'contract_cancelled',
          meetingId: contract.meetingId,
          recordedOn: toSeoulDate(new Date()),
        },
      });
      await syncConsultationStatus(tx, contract.meeting.consultationId);
      await syncListingStatus(tx, contract.meeting.listingId);
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

  private async lockContract(tx: Prisma.TransactionClient, id: string) {
    const found = await tx.kkiruContract.findUnique({
      select: { meeting: { select: { consultationId: true, id: true } } },
      where: { id },
    });

    if (!found) {
      throw contractNotFound();
    }

    await lockRow(tx, 'consultations', found.meeting.consultationId);
    await lockRow(tx, 'meetings', found.meeting.id);
    await lockRow(tx, 'contracts', id);

    return tx.kkiruContract.findUniqueOrThrow({
      include: { meeting: { include: { listing: true } } },
      where: { id },
    });
  }
}
