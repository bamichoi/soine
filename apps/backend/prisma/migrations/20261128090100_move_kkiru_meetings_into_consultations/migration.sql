-- 상담을 미팅으로 합치기 2/5: 옛 미팅 데이터를 상담으로 옮긴다(ADR-0009).

-- 옛 미팅의 (상담, 매물)을 상담매물로 넣는다. 이미 있으면 그대로 둔다.
INSERT INTO "kkiru"."consultation_listings" ("consultationId", "listingId", "createdAt")
SELECT m."consultationId", m."listingId", MIN(m."createdAt")
FROM "kkiru"."meetings" m
GROUP BY m."consultationId", m."listingId"
ON CONFLICT DO NOTHING;

-- 옛 미팅마다 "[매물 이름] 미팅 일시 YYYY-MM-DD HH:mm"(한국 시각) 기록을 남긴다.
-- 그 미팅의 첫 기록보다 앞에 오도록 만든 시각을 1밀리초 앞당긴다.
INSERT INTO "kkiru"."consultation_records"
  ("id", "consultationId", "kind", "recordedOn", "content", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  m."consultationId",
  'note',
  (m."meetAt" AT TIME ZONE 'Asia/Seoul')::date,
  '[' || l."name" || '] 미팅 일시 ' || to_char(m."meetAt" AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'),
  m."createdAt" - INTERVAL '1 millisecond',
  m."createdAt" - INTERVAL '1 millisecond'
FROM "kkiru"."meetings" m
JOIN "kkiru"."listings" l ON l."id" = m."listingId";

-- 옛 미팅 로그를 상담 로그로 복사한다. 종류는 유지하고 내용 앞에 매물 이름을 붙인다.
INSERT INTO "kkiru"."consultation_records"
  ("id", "consultationId", "kind", "recordedOn", "content", "createdAt", "updatedAt")
SELECT
  r."id",
  m."consultationId",
  r."kind",
  r."recordedOn",
  '[' || l."name" || '] ' || r."content",
  r."createdAt",
  r."updatedAt"
FROM "kkiru"."meeting_records" r
JOIN "kkiru"."meetings" m ON m."id" = r."meetingId"
JOIN "kkiru"."listings" l ON l."id" = m."listingId";

-- 미팅 일시 = 옛 미팅 중 가장 이른 미팅 일시. 없으면 상담 일자 00:00(한국 시각).
UPDATE "kkiru"."consultations" c
SET "meetAt" = COALESCE(
  (SELECT MIN(m."meetAt") FROM "kkiru"."meetings" m WHERE m."consultationId" = c."id"),
  c."consultedOn"::timestamp AT TIME ZONE 'Asia/Seoul'
);

ALTER TABLE "kkiru"."consultations" ALTER COLUMN "meetAt" SET NOT NULL;

DROP INDEX "kkiru"."consultations_consulted_on_idx";
ALTER TABLE "kkiru"."consultations" DROP COLUMN "consultedOn";

-- 계약: 대상 매물을 옛 미팅의 매물로 채우고, 미팅 참조를 새 미팅(지금의 상담)으로 바꾼다.
ALTER TABLE "kkiru"."contracts" DROP CONSTRAINT "contracts_meetingId_fkey";

UPDATE "kkiru"."contracts" k
SET "listingId" = m."listingId", "meetingId" = m."consultationId"
FROM "kkiru"."meetings" m
WHERE m."id" = k."meetingId";

ALTER TABLE "kkiru"."contracts" ALTER COLUMN "listingId" SET NOT NULL;

CREATE INDEX "contracts_listing_id_idx" ON "kkiru"."contracts"("listingId");

ALTER TABLE "kkiru"."contracts"
  ADD CONSTRAINT "contracts_listingId_fkey" FOREIGN KEY ("listingId")
  REFERENCES "kkiru"."listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "kkiru"."contracts"
  ADD CONSTRAINT "contracts_meetingId_fkey" FOREIGN KEY ("meetingId")
  REFERENCES "kkiru"."consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
