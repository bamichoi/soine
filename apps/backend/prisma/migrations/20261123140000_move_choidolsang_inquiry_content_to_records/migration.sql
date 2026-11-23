-- 첫 문의 내용을 문의 내용 로그(inquiry_records)의 첫 기록으로 옮긴다.
-- 이미 있는 기록보다 앞에 오도록 기록 날짜는 문의 날짜, 등록 시각은 문의 등록 시각으로 둔다.
INSERT INTO "choidolsang"."inquiry_records" ("id", "inquiryId", "recordedOn", "content", "createdAt")
SELECT gen_random_uuid(), "id", "inquiredOn", "content", "createdAt"
FROM "choidolsang"."inquiries";

-- AlterTable
ALTER TABLE "choidolsang"."inquiries" DROP COLUMN "content";
