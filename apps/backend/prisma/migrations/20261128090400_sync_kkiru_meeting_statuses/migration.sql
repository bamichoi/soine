-- 상담을 미팅으로 합치기 5/5: 미팅·매물 상태를 새 규칙으로 다시 계산한다(ADR-0009, common/status-sync.ts).
-- 미팅 상태를 먼저, 매물 상태를 나중에 맞춘다.

-- 미팅: 완료 계약 > 계약중 계약 > 중단 > 취소 계약만 > 미팅중
UPDATE "kkiru"."meetings" m
SET "status" = CASE
  WHEN EXISTS (SELECT 1 FROM "kkiru"."contracts" k WHERE k."meetingId" = m."id" AND k."status" = 'completed')
    THEN 'contracted'::"kkiru"."meeting_status"
  WHEN EXISTS (SELECT 1 FROM "kkiru"."contracts" k WHERE k."meetingId" = m."id" AND k."status" = 'contracting')
    THEN 'contracting'::"kkiru"."meeting_status"
  WHEN m."stoppedAt" IS NOT NULL
    THEN 'stopped'::"kkiru"."meeting_status"
  WHEN EXISTS (SELECT 1 FROM "kkiru"."contracts" k WHERE k."meetingId" = m."id" AND k."status" = 'cancelled')
    THEN 'contract_cancelled'::"kkiru"."meeting_status"
  ELSE 'meeting'::"kkiru"."meeting_status"
END;

-- 매물: 완료 계약 > 계약중 계약 > 미팅중·계약취소 미팅의 미팅 매물 > 계약가능
UPDATE "kkiru"."listings" l
SET "status" = CASE
  WHEN EXISTS (SELECT 1 FROM "kkiru"."contracts" k WHERE k."listingId" = l."id" AND k."status" = 'completed')
    THEN 'contracted'::"kkiru"."listing_status"
  WHEN EXISTS (SELECT 1 FROM "kkiru"."contracts" k WHERE k."listingId" = l."id" AND k."status" = 'contracting')
    THEN 'contracting'::"kkiru"."listing_status"
  WHEN EXISTS (
    SELECT 1
    FROM "kkiru"."meeting_listings" ml
    JOIN "kkiru"."meetings" m ON m."id" = ml."meetingId"
    WHERE ml."listingId" = l."id" AND m."status" IN ('meeting', 'contract_cancelled')
  )
    THEN 'meeting'::"kkiru"."listing_status"
  ELSE 'available'::"kkiru"."listing_status"
END;
