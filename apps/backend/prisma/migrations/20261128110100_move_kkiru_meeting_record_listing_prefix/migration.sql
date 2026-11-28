-- 미팅 기록 내용 앞의 "[매물 이름] "을 관련 매물 연결로 옮긴다(ADR-0009).
-- 그 미팅의 미팅 매물 중 이름이 정확히 같은 매물이 하나뿐일 때만 옮긴다.
-- 맞는 매물이 없거나 둘 이상이면, 또는 앞머리를 떼면 내용이 비면 그대로 둔다.
WITH "candidates" AS (
  SELECT r."id" AS "recordId", l."id" AS "listingId", char_length(l."name") AS "nameLength"
  FROM "kkiru"."meeting_records" r
  JOIN "kkiru"."meeting_listings" ml ON ml."meetingId" = r."meetingId"
  JOIN "kkiru"."listings" l ON l."id" = ml."listingId"
  WHERE r."listingId" IS NULL
    AND left(r."content", char_length(l."name") + 3) = '[' || l."name" || '] '
),
"single" AS (
  SELECT
    "recordId",
    (array_agg("listingId"))[1] AS "listingId",
    (array_agg("nameLength"))[1] AS "nameLength"
  FROM "candidates"
  GROUP BY "recordId"
  HAVING count(*) = 1
)
UPDATE "kkiru"."meeting_records" r
SET "listingId" = s."listingId",
    "content" = substr(r."content", s."nameLength" + 4)
FROM "single" s
WHERE r."id" = s."recordId"
  AND btrim(substr(r."content", s."nameLength" + 4)) <> '';
