-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "choidolsang";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "kkiru";

-- CreateTable
CREATE TABLE "choidolsang"."admins" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "choidolsang"."admin_sessions" (
    "sid" VARCHAR(255) NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "kkiru"."admins" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kkiru"."admin_sessions" (
    "sid" VARCHAR(255) NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "choidolsang"."admins"("email");

-- CreateIndex
CREATE INDEX "admin_sessions_expire_idx" ON "choidolsang"."admin_sessions"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "kkiru"."admins"("email");

-- CreateIndex
CREATE INDEX "admin_sessions_expire_idx" ON "kkiru"."admin_sessions"("expire");
