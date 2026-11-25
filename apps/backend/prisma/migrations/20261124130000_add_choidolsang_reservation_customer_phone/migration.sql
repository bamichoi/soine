-- 예약자 연락처(필수). 이미 있는 예약은 빈 값으로 채운 뒤 기본값을 없앤다.
ALTER TABLE "choidolsang"."reservations" ADD COLUMN "customerPhone" VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE "choidolsang"."reservations" ALTER COLUMN "customerPhone" DROP DEFAULT;
