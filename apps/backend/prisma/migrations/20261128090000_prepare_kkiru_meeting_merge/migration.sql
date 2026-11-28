-- 상담을 미팅으로 합치기 1/5: 새 컬럼을 더한다(ADR-0009).
-- 상담 로그에 기록 종류(옛 미팅 로그의 meeting_record_kind를 그대로 쓴다)를 더한다.
ALTER TABLE "kkiru"."consultation_records"
  ADD COLUMN "kind" "kkiru"."meeting_record_kind" NOT NULL DEFAULT 'note';

-- 미팅 중단 시각과 미팅 일시. 미팅 일시는 다음 마이그레이션에서 채운 뒤 필수로 바꾼다.
ALTER TABLE "kkiru"."consultations"
  ADD COLUMN "stoppedAt" TIMESTAMPTZ(3),
  ADD COLUMN "meetAt" TIMESTAMPTZ(3);

-- 계약 대상 매물. 다음 마이그레이션에서 옛 미팅의 매물로 채운 뒤 필수로 바꾼다.
ALTER TABLE "kkiru"."contracts" ADD COLUMN "listingId" UUID;
