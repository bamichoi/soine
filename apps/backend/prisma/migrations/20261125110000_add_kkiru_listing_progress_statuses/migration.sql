-- 매물 상태에 미팅중·계약중을 더한다. 걸린 미팅 상태에서 계산해 맞춘다(ADR-0008).
ALTER TYPE "kkiru"."listing_status" ADD VALUE 'meeting' BEFORE 'contracted';
ALTER TYPE "kkiru"."listing_status" ADD VALUE 'contracting' BEFORE 'contracted';
