-- 미팅 기록에 관련 매물(선택)을 더한다(ADR-0009).
-- AlterTable
ALTER TABLE "kkiru"."meeting_records" ADD COLUMN "listingId" UUID;

-- CreateIndex
CREATE INDEX "meeting_records_listing_id_idx" ON "kkiru"."meeting_records"("listingId");

-- AddForeignKey
ALTER TABLE "kkiru"."meeting_records" ADD CONSTRAINT "meeting_records_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "kkiru"."listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
