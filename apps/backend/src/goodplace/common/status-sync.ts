import type {
  GoodplaceContractStatus,
  GoodplaceListingStatus,
  GoodplaceMeetingStatus,
  Prisma,
} from '../../generated/prisma/client';

// 미팅·매물 상태는 계약과 중단 여부에서 계산한다(ADR-0009). 버튼으로 직접 바꾸지 않는다.
// 바꾼 트랜잭션 안에서 미팅 상태를 먼저, 매물 상태를 나중에 맞춘다.
// 잠금 순서는 미팅 → 계약 → 매물(매물끼리는 id 순)로 지켜 교착을 막는다.

/** 새 계약은 미팅중이거나 계약이 취소된 미팅에서만 만든다. 미팅 중단도 이 두 상태에서만 한다. */
export const CONTRACTABLE_MEETING_STATUSES: GoodplaceMeetingStatus[] = [
  'meeting',
  'contract_cancelled',
];

/**
 * 미팅 상태: 완료 계약 → 계약완료 > 계약중 계약 → 계약중 > 중단됨 → 진행중단
 * > 취소 계약만 있음 → 계약취소 > 그 외 미팅중
 */
export function deriveMeetingStatus(input: {
  contractStatuses: GoodplaceContractStatus[];
  isStopped: boolean;
}): GoodplaceMeetingStatus {
  const { contractStatuses, isStopped } = input;

  if (contractStatuses.includes('completed')) {
    return 'contracted';
  }

  if (contractStatuses.includes('contracting')) {
    return 'contracting';
  }

  if (isStopped) {
    return 'stopped';
  }

  return contractStatuses.includes('cancelled') ? 'contract_cancelled' : 'meeting';
}

/**
 * 매물 상태: 이 매물의 완료 계약 → 계약완료 > 계약중 계약 → 계약중
 * > 미팅중·계약취소 상태인 미팅의 미팅 매물 → 미팅중 > 그 외 계약가능
 */
export function deriveListingStatus(input: {
  contractStatuses: GoodplaceContractStatus[];
  meetingStatuses: GoodplaceMeetingStatus[];
}): GoodplaceListingStatus {
  const { contractStatuses, meetingStatuses } = input;

  if (contractStatuses.includes('completed')) {
    return 'contracted';
  }

  if (contractStatuses.includes('contracting')) {
    return 'contracting';
  }

  return meetingStatuses.some((status) => CONTRACTABLE_MEETING_STATUSES.includes(status))
    ? 'meeting'
    : 'available';
}

/** 미팅의 계약과 중단 여부를 읽어 미팅 상태를 다시 맞춘다. */
export async function syncMeetingStatus(
  tx: Prisma.TransactionClient,
  meetingId: string,
): Promise<GoodplaceMeetingStatus> {
  const meeting = await tx.goodplaceMeeting.findUniqueOrThrow({
    select: { contracts: { select: { status: true } }, stoppedAt: true },
    where: { id: meetingId },
  });
  const status = deriveMeetingStatus({
    contractStatuses: meeting.contracts.map((contract) => contract.status),
    isStopped: meeting.stoppedAt !== null,
  });

  await tx.goodplaceMeeting.update({ data: { status }, where: { id: meetingId } });

  return status;
}

/** 매물의 계약과, 이 매물이 미팅 매물로 걸린 미팅 상태를 읽어 매물 상태를 다시 맞춘다. */
export async function syncListingStatus(
  tx: Prisma.TransactionClient,
  listingId: string,
): Promise<GoodplaceListingStatus> {
  const contracts = await tx.goodplaceContract.findMany({
    select: { status: true },
    where: { listingId },
  });
  const links = await tx.goodplaceMeetingListing.findMany({
    select: { meeting: { select: { status: true } } },
    where: { listingId },
  });
  const status = deriveListingStatus({
    contractStatuses: contracts.map((contract) => contract.status),
    meetingStatuses: links.map((link) => link.meeting.status),
  });

  await tx.goodplaceListing.update({ data: { status }, where: { id: listingId } });

  return status;
}

/** 같은 미팅·계약·매물을 동시에 바꾸지 않도록 행을 잠근다. */
export async function lockRow(
  tx: Prisma.TransactionClient,
  table: 'meetings' | 'contracts' | 'listings',
  id: string,
): Promise<void> {
  // 테이블 이름은 위 세 값 중 하나로만 들어온다.
  await tx.$executeRawUnsafe(
    `SELECT 1 FROM "goodplace"."${table}" WHERE "id" = $1::uuid FOR UPDATE`,
    id,
  );
}

/**
 * 미팅의 모든 미팅 매물과 계약 매물(그리고 extraListingIds)을 id 순으로 잠그고 id 목록을 돌려준다.
 * 미팅(과 계약)을 잠근 뒤에 부른다.
 */
export async function lockMeetingListings(
  tx: Prisma.TransactionClient,
  meetingId: string,
  extraListingIds: string[] = [],
): Promise<string[]> {
  const links = await tx.goodplaceMeetingListing.findMany({
    select: { listingId: true },
    where: { meetingId },
  });
  const contracts = await tx.goodplaceContract.findMany({
    select: { listingId: true },
    where: { meetingId },
  });
  const ids = [
    ...new Set([
      ...links.map((link) => link.listingId),
      ...contracts.map((contract) => contract.listingId),
      ...extraListingIds,
    ]),
  ].sort();

  for (const id of ids) {
    await lockRow(tx, 'listings', id);
  }

  return ids;
}

/**
 * 미팅 중단·재개, 계약 생성·완료·취소 뒤에 부른다.
 * 미팅 상태를 먼저 맞추고, 그 미팅의 모든 미팅 매물과 계약 매물 상태를 다시 맞춘다.
 */
export async function syncMeetingAndListings(
  tx: Prisma.TransactionClient,
  meetingId: string,
): Promise<GoodplaceMeetingStatus> {
  const status = await syncMeetingStatus(tx, meetingId);
  const listingIds = await lockMeetingListings(tx, meetingId);

  for (const listingId of listingIds) {
    await syncListingStatus(tx, listingId);
  }

  return status;
}
