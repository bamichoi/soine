-- 문의의 희망 돌상 컨셉을 자유 입력 글에서 돌상 컨셉 참조로 바꾼다.
ALTER TABLE "choidolsang"."inquiries" ADD COLUMN "desiredConceptId" UUID;

-- 기존 글이 컨셉 이름과 정확히 같으면(앞뒤 공백·대소문자 무시) 그 컨셉으로 잇는다.
-- 같은 이름의 컨셉이 여럿이면 가장 먼저 등록된 것을 고른다. 맞는 컨셉이 없으면 비워 둔다.
UPDATE "choidolsang"."inquiries" AS i
SET "desiredConceptId" = (
  SELECT c."id"
  FROM "choidolsang"."concepts" AS c
  WHERE c."deletedAt" IS NULL
    AND lower(btrim(c."name")) = lower(btrim(i."desiredConcept"))
  ORDER BY c."createdAt", c."id"
  LIMIT 1
)
WHERE i."desiredConcept" IS NOT NULL;

ALTER TABLE "choidolsang"."inquiries" DROP COLUMN "desiredConcept";

-- CreateIndex
CREATE INDEX "inquiries_desired_concept_id_idx" ON "choidolsang"."inquiries"("desiredConceptId");

-- AddForeignKey
ALTER TABLE "choidolsang"."inquiries" ADD CONSTRAINT "inquiries_desiredConceptId_fkey" FOREIGN KEY ("desiredConceptId") REFERENCES "choidolsang"."concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
