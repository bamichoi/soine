-- 새 enum 값은 값을 더한 트랜잭션 안에서 쓸 수 없어 마이그레이션을 나눈다.
-- 기존 매물 상태를 걸린 미팅 중 가장 앞선 단계로 맞춘다. 진행중단된 미팅은 세지 않는다.
UPDATE "kkiru"."listings" AS l
SET "status" = CASE
  WHEN EXISTS (SELECT 1 FROM "kkiru"."meetings" m WHERE m."listingId" = l."id" AND m."status" = 'contracted')
    THEN 'contracted'::"kkiru"."listing_status"
  WHEN EXISTS (SELECT 1 FROM "kkiru"."meetings" m WHERE m."listingId" = l."id" AND m."status" = 'contracting')
    THEN 'contracting'::"kkiru"."listing_status"
  WHEN EXISTS (
    SELECT 1 FROM "kkiru"."meetings" m
    WHERE m."listingId" = l."id" AND m."status" IN ('meeting', 'contract_cancelled')
  )
    THEN 'meeting'::"kkiru"."listing_status"
  ELSE 'available'::"kkiru"."listing_status"
END;
