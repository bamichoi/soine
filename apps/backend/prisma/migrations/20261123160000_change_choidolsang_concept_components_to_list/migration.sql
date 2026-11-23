-- 구성품을 자유 글에서 항목 목록으로 바꾼다. 기존 글은 줄 단위로 나눠 항목으로 옮긴다.
ALTER TABLE "choidolsang"."concepts"
  ALTER COLUMN "components" TYPE TEXT[]
  USING CASE
    WHEN "components" IS NULL OR btrim("components") = '' THEN ARRAY[]::TEXT[]
    ELSE array_remove(regexp_split_to_array(btrim("components"), '\s*\n\s*'), '')
  END,
  ALTER COLUMN "components" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "components" SET NOT NULL;
