-- CreateEnum
CREATE TYPE "kkiru"."listing_status" AS ENUM ('available', 'contracted');

-- CreateEnum
CREATE TYPE "kkiru"."consultation_status" AS ENUM ('consulting', 'meeting', 'contracting', 'contracted', 'contract_cancelled');

-- CreateEnum
CREATE TYPE "kkiru"."inflow_source" AS ENUM ('naver_land', 'instagram', 'other');

-- CreateEnum
CREATE TYPE "kkiru"."meeting_status" AS ENUM ('meeting', 'contracting', 'contracted', 'contract_cancelled', 'stopped');

-- CreateEnum
CREATE TYPE "kkiru"."meeting_record_kind" AS ENUM ('note', 'stopped', 'resumed', 'contract_cancelled');

-- CreateEnum
CREATE TYPE "kkiru"."contract_status" AS ENUM ('contracting', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "kkiru"."customers" (
    "id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kkiru"."listings" (
    "id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "areaM2" DECIMAL(10,2) NOT NULL,
    "floor" VARCHAR(50) NOT NULL,
    "rent" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL,
    "premium" INTEGER NOT NULL,
    "hasParking" BOOLEAN,
    "restroomCount" INTEGER,
    "features" TEXT,
    "clientName" VARCHAR(100) NOT NULL,
    "clientPhone" VARCHAR(20) NOT NULL,
    "status" "kkiru"."listing_status" NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kkiru"."consultations" (
    "id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "customerId" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "interestArea" VARCHAR(200) NOT NULL,
    "desiredBusiness" VARCHAR(200) NOT NULL,
    "desiredPyeongMin" DECIMAL(8,2) NOT NULL,
    "desiredPyeongMax" DECIMAL(8,2) NOT NULL,
    "desiredFloor" VARCHAR(50) NOT NULL,
    "desiredRent" INTEGER NOT NULL,
    "maxDeposit" INTEGER NOT NULL,
    "maxPremium" INTEGER NOT NULL,
    "inflowSource" "kkiru"."inflow_source" NOT NULL,
    "inflowSourceDetail" VARCHAR(100),
    "consultedOn" DATE NOT NULL,
    "status" "kkiru"."consultation_status" NOT NULL DEFAULT 'consulting',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kkiru"."consultation_records" (
    "id" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "recordedOn" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "consultation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kkiru"."consultation_listings" (
    "consultationId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_listings_pkey" PRIMARY KEY ("consultationId","listingId")
);

-- CreateTable
CREATE TABLE "kkiru"."meetings" (
    "id" UUID NOT NULL,
    "consultationId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "meetAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "kkiru"."meeting_status" NOT NULL DEFAULT 'meeting',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kkiru"."meeting_records" (
    "id" UUID NOT NULL,
    "meetingId" UUID NOT NULL,
    "kind" "kkiru"."meeting_record_kind" NOT NULL DEFAULT 'note',
    "recordedOn" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meeting_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kkiru"."contracts" (
    "id" UUID NOT NULL,
    "meetingId" UUID NOT NULL,
    "contractedOn" DATE NOT NULL,
    "landlordName" VARCHAR(100) NOT NULL,
    "landlordPhone" VARCHAR(20) NOT NULL,
    "deposit" INTEGER NOT NULL,
    "rent" INTEGER NOT NULL,
    "premium" INTEGER NOT NULL,
    "leaseStartOn" DATE NOT NULL,
    "leaseEndOn" DATE NOT NULL,
    "specialTerms" TEXT,
    "downPayment" INTEGER NOT NULL,
    "commission" INTEGER NOT NULL,
    "isMyListing" BOOLEAN NOT NULL,
    "isMyClient" BOOLEAN NOT NULL,
    "status" "kkiru"."contract_status" NOT NULL DEFAULT 'contracting',
    "cancelReason" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "kkiru"."customers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "kkiru"."customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "listings_code_key" ON "kkiru"."listings"("code");

-- CreateIndex
CREATE INDEX "listings_created_at_idx" ON "kkiru"."listings"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "consultations_code_key" ON "kkiru"."consultations"("code");

-- CreateIndex
CREATE INDEX "consultations_customer_id_idx" ON "kkiru"."consultations"("customerId");

-- CreateIndex
CREATE INDEX "consultations_consulted_on_idx" ON "kkiru"."consultations"("consultedOn" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "consultation_records_consultation_id_idx" ON "kkiru"."consultation_records"("consultationId", "recordedOn", "createdAt");

-- CreateIndex
CREATE INDEX "consultation_listings_listing_id_idx" ON "kkiru"."consultation_listings"("listingId");

-- CreateIndex
CREATE INDEX "meetings_consultation_id_idx" ON "kkiru"."meetings"("consultationId");

-- CreateIndex
CREATE INDEX "meetings_listing_id_idx" ON "kkiru"."meetings"("listingId");

-- CreateIndex
CREATE INDEX "meetings_meet_at_idx" ON "kkiru"."meetings"("meetAt" DESC);

-- CreateIndex
CREATE INDEX "meeting_records_meeting_id_idx" ON "kkiru"."meeting_records"("meetingId", "recordedOn", "createdAt");

-- CreateIndex
CREATE INDEX "contracts_meeting_id_idx" ON "kkiru"."contracts"("meetingId");

-- CreateIndex
CREATE INDEX "contracts_contracted_on_idx" ON "kkiru"."contracts"("contractedOn" DESC);

-- AddForeignKey
ALTER TABLE "kkiru"."consultations" ADD CONSTRAINT "consultations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "kkiru"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kkiru"."consultation_records" ADD CONSTRAINT "consultation_records_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "kkiru"."consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kkiru"."consultation_listings" ADD CONSTRAINT "consultation_listings_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "kkiru"."consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kkiru"."consultation_listings" ADD CONSTRAINT "consultation_listings_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "kkiru"."listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kkiru"."meetings" ADD CONSTRAINT "meetings_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "kkiru"."consultations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kkiru"."meetings" ADD CONSTRAINT "meetings_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "kkiru"."listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kkiru"."meeting_records" ADD CONSTRAINT "meeting_records_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "kkiru"."meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kkiru"."contracts" ADD CONSTRAINT "contracts_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "kkiru"."meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

