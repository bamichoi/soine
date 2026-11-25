-- 예약 번호를 예약을 만든 문의의 문의 번호와 같게 맞춘다. 문의 하나에 예약 하나라 겹치지 않는다.
UPDATE "choidolsang"."reservations" AS r
SET "code" = i."code"
FROM "choidolsang"."inquiries" AS i
WHERE i."id" = r."inquiryId" AND r."code" <> i."code";
