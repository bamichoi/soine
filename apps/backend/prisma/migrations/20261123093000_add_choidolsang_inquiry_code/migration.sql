-- 문의 번호: 순서가 드러나지 않는 8자리 무작위 코드.
-- 이미 있는 문의에는 무작위 코드를 채운 뒤 필수·고유 제약을 건다.
-- AlterTable
ALTER TABLE "choidolsang"."inquiries" ADD COLUMN "code" VARCHAR(16);

UPDATE "choidolsang"."inquiries"
SET "code" = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || "id"::TEXT) FROM 1 FOR 8))
WHERE "code" IS NULL;

ALTER TABLE "choidolsang"."inquiries" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "inquiries_code_key" ON "choidolsang"."inquiries"("code");
