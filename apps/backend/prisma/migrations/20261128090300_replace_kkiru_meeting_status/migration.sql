-- 상담을 미팅으로 합치기 4/5: 상담 상태를 새 미팅 상태로 바꾼다(ADR-0009). 상담중 → 미팅중.
-- 실제 상태는 다음 마이그레이션에서 새 규칙으로 다시 계산한다.
CREATE TYPE "kkiru"."meeting_status" AS ENUM ('meeting', 'contracting', 'contracted', 'contract_cancelled', 'stopped');

ALTER TABLE "kkiru"."meetings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "kkiru"."meetings"
  ALTER COLUMN "status" TYPE "kkiru"."meeting_status"
  USING (
    CASE "status"::text WHEN 'consulting' THEN 'meeting' ELSE "status"::text END
  )::"kkiru"."meeting_status";
ALTER TABLE "kkiru"."meetings" ALTER COLUMN "status" SET DEFAULT 'meeting';

DROP TYPE "kkiru"."consultation_status";
