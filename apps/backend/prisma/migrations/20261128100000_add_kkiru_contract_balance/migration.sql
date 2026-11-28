-- 계약에 잔금(만원)과 잔금일을 더한다.
ALTER TABLE "kkiru"."contracts" ADD COLUMN "balance" INTEGER,
ADD COLUMN "balanceDueOn" DATE;

-- 기존 계약: 잔금 = 보증금 − 계약금(음수면 0), 잔금일 = 임대차 시작일(없으면 계약 일자)
UPDATE "kkiru"."contracts"
SET "balance" = GREATEST("deposit" - "downPayment", 0),
    "balanceDueOn" = COALESCE("leaseStartOn", "contractedOn");

ALTER TABLE "kkiru"."contracts" ALTER COLUMN "balance" SET NOT NULL,
ALTER COLUMN "balanceDueOn" SET NOT NULL;

-- CreateIndex
CREATE INDEX "contracts_balance_due_on_idx" ON "kkiru"."contracts"("balanceDueOn");
