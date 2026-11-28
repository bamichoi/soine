import type {
  KkiruConsultationStatus,
  KkiruListingStatus,
  KkiruMeetingStatus,
  Prisma,
} from '../../generated/prisma/client';

// 상담 상태 = 연결된 미팅 중 가장 앞선 단계. 진행중단된 미팅은 세지 않는다.
const CONSULTATION_PRIORITY: {
  meeting: KkiruMeetingStatus;
  consultation: KkiruConsultationStatus;
}[] = [
  { consultation: 'contracted', meeting: 'contracted' },
  { consultation: 'contracting', meeting: 'contracting' },
  { consultation: 'meeting', meeting: 'meeting' },
  { consultation: 'contract_cancelled', meeting: 'contract_cancelled' },
];

export function deriveConsultationStatus(
  meetingStatuses: KkiruMeetingStatus[],
): KkiruConsultationStatus {
  const found = CONSULTATION_PRIORITY.find(({ meeting }) => meetingStatuses.includes(meeting));
  return found ? found.consultation : 'consulting';
}

/** 상담의 미팅 상태를 읽어 상담 상태를 다시 맞춘다. 미팅·계약을 바꾼 트랜잭션 안에서 부른다. */
export async function syncConsultationStatus(
  tx: Prisma.TransactionClient,
  consultationId: string,
): Promise<KkiruConsultationStatus> {
  const meetings = await tx.kkiruMeeting.findMany({
    select: { status: true },
    where: { consultationId },
  });
  const status = deriveConsultationStatus(meetings.map((meeting) => meeting.status));

  await tx.kkiruConsultation.update({ data: { status }, where: { id: consultationId } });

  return status;
}

// 매물 상태 = 이 매물에 걸린 미팅 중 가장 앞선 단계. 진행중단된 미팅은 세지 않는다.
// 계약이 취소된 미팅은 그 매물로 다시 계약할 수 있으므로 미팅중으로 본다.
const LISTING_PRIORITY: { meeting: KkiruMeetingStatus; listing: KkiruListingStatus }[] = [
  { listing: 'contracted', meeting: 'contracted' },
  { listing: 'contracting', meeting: 'contracting' },
  { listing: 'meeting', meeting: 'meeting' },
  { listing: 'meeting', meeting: 'contract_cancelled' },
];

export function deriveListingStatus(meetingStatuses: KkiruMeetingStatus[]): KkiruListingStatus {
  const found = LISTING_PRIORITY.find(({ meeting }) => meetingStatuses.includes(meeting));
  return found ? found.listing : 'available';
}

/** 매물에 걸린 미팅 상태를 읽어 매물 상태를 다시 맞춘다. 미팅·계약을 바꾼 트랜잭션 안에서 부른다. */
export async function syncListingStatus(
  tx: Prisma.TransactionClient,
  listingId: string,
): Promise<KkiruListingStatus> {
  const meetings = await tx.kkiruMeeting.findMany({
    select: { status: true },
    where: { listingId },
  });
  const status = deriveListingStatus(meetings.map((meeting) => meeting.status));

  await tx.kkiruListing.update({ data: { status }, where: { id: listingId } });

  return status;
}

/** 같은 상담·미팅을 동시에 바꾸지 않도록 행을 잠근다. */
export async function lockRow(
  tx: Prisma.TransactionClient,
  table: 'consultations' | 'meetings' | 'contracts' | 'listings',
  id: string,
): Promise<void> {
  // 테이블 이름은 위 네 값 중 하나로만 들어온다.
  await tx.$executeRawUnsafe(
    `SELECT 1 FROM "kkiru"."${table}" WHERE "id" = $1::uuid FOR UPDATE`,
    id,
  );
}
