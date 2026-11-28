-- 상담을 미팅으로 합치기 3/5: 옛 미팅을 지우고 상담을 미팅으로 이름을 바꾼다(ADR-0009).
-- 끼루 데이터 삭제 금지 원칙의 예외다. 옛 미팅 데이터는 앞 마이그레이션에서 모두 옮겼다.
-- 이름이 겹치므로 옛 테이블을 먼저 지운 뒤 이름을 바꾼다.
DROP TABLE "kkiru"."meeting_records";
DROP TABLE "kkiru"."meetings";
DROP TYPE "kkiru"."meeting_status";

-- consultations → meetings
ALTER TABLE "kkiru"."consultations" RENAME TO "meetings";
ALTER TABLE "kkiru"."meetings" RENAME CONSTRAINT "consultations_pkey" TO "meetings_pkey";
ALTER TABLE "kkiru"."meetings"
  RENAME CONSTRAINT "consultations_customerId_fkey" TO "meetings_customerId_fkey";
ALTER INDEX "kkiru"."consultations_code_key" RENAME TO "meetings_code_key";
ALTER INDEX "kkiru"."consultations_customer_id_idx" RENAME TO "meetings_customer_id_idx";
CREATE INDEX "meetings_meet_at_idx" ON "kkiru"."meetings"("meetAt" DESC, "createdAt" DESC);

-- consultation_records → meeting_records
ALTER TABLE "kkiru"."consultation_records" RENAME TO "meeting_records";
ALTER TABLE "kkiru"."meeting_records" RENAME COLUMN "consultationId" TO "meetingId";
ALTER TABLE "kkiru"."meeting_records"
  RENAME CONSTRAINT "consultation_records_pkey" TO "meeting_records_pkey";
ALTER TABLE "kkiru"."meeting_records"
  RENAME CONSTRAINT "consultation_records_consultationId_fkey" TO "meeting_records_meetingId_fkey";
ALTER INDEX "kkiru"."consultation_records_consultation_id_idx"
  RENAME TO "meeting_records_meeting_id_idx";

-- consultation_listings → meeting_listings
ALTER TABLE "kkiru"."consultation_listings" RENAME TO "meeting_listings";
ALTER TABLE "kkiru"."meeting_listings" RENAME COLUMN "consultationId" TO "meetingId";
ALTER TABLE "kkiru"."meeting_listings"
  RENAME CONSTRAINT "consultation_listings_pkey" TO "meeting_listings_pkey";
ALTER TABLE "kkiru"."meeting_listings"
  RENAME CONSTRAINT "consultation_listings_consultationId_fkey" TO "meeting_listings_meetingId_fkey";
ALTER TABLE "kkiru"."meeting_listings"
  RENAME CONSTRAINT "consultation_listings_listingId_fkey" TO "meeting_listings_listingId_fkey";
ALTER INDEX "kkiru"."consultation_listings_listing_id_idx"
  RENAME TO "meeting_listings_listing_id_idx";
