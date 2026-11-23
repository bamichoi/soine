-- CreateTable
CREATE TABLE "choidolsang"."inquiry_records" (
    "id" UUID NOT NULL,
    "inquiryId" UUID NOT NULL,
    "recordedOn" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inquiry_records_inquiry_id_idx" ON "choidolsang"."inquiry_records"("inquiryId", "recordedOn", "createdAt");

-- AddForeignKey
ALTER TABLE "choidolsang"."inquiry_records" ADD CONSTRAINT "inquiry_records_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "choidolsang"."inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

