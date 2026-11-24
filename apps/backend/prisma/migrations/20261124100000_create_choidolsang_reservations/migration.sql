-- CreateEnum
CREATE TYPE "choidolsang"."reservation_status" AS ENUM ('reserved', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "choidolsang"."baby_gender" AS ENUM ('boy', 'girl');

-- CreateTable
CREATE TABLE "choidolsang"."reservations" (
    "id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "inquiryId" UUID NOT NULL,
    "customerName" VARCHAR(100) NOT NULL,
    "eventAt" TIMESTAMPTZ(3) NOT NULL,
    "eventLocation" VARCHAR(200) NOT NULL,
    "babyName" VARCHAR(100),
    "babyGender" "choidolsang"."baby_gender",
    "conceptId" UUID NOT NULL,
    "guestCount" INTEGER,
    "hasSnap" BOOLEAN NOT NULL DEFAULT false,
    "requests" TEXT,
    "extraComponents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalAmount" INTEGER NOT NULL,
    "depositAmount" INTEGER NOT NULL DEFAULT 50000,
    "confirmedOn" DATE NOT NULL,
    "status" "choidolsang"."reservation_status" NOT NULL DEFAULT 'reserved',
    "cancelledAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservations_code_key" ON "choidolsang"."reservations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_inquiryId_key" ON "choidolsang"."reservations"("inquiryId");

-- CreateIndex
CREATE INDEX "reservations_event_at_idx" ON "choidolsang"."reservations"("eventAt" DESC);

-- CreateIndex
CREATE INDEX "reservations_concept_id_idx" ON "choidolsang"."reservations"("conceptId");

-- AddForeignKey
ALTER TABLE "choidolsang"."reservations" ADD CONSTRAINT "reservations_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "choidolsang"."inquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choidolsang"."reservations" ADD CONSTRAINT "reservations_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "choidolsang"."concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

