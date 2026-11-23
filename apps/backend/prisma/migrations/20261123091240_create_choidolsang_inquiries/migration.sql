-- CreateEnum
CREATE TYPE "choidolsang"."inquiry_status" AS ENUM ('pending', 'confirmed', 'rejected');

-- CreateTable
CREATE TABLE "choidolsang"."inquiries" (
    "id" UUID NOT NULL,
    "inquiredOn" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "desiredReservationAt" TIMESTAMPTZ(3),
    "location" VARCHAR(200),
    "desiredConcept" VARCHAR(200),
    "status" "choidolsang"."inquiry_status" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inquiries_inquired_on_idx" ON "choidolsang"."inquiries"("inquiredOn" DESC, "createdAt" DESC);
