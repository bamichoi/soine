-- CreateTable
CREATE TABLE "choidolsang"."concepts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "components" TEXT,
    "price" INTEGER NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "concepts_created_at_idx" ON "choidolsang"."concepts"("createdAt" DESC);

