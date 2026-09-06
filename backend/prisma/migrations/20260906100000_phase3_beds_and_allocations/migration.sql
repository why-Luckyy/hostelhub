-- Phase 3 Migration: Beds and Safe Allocation Management
-- 1. Create beds table
CREATE TABLE "beds" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "bedLabel" VARCHAR(20) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: A room cannot have duplicate bed labels
CREATE UNIQUE INDEX "beds_roomId_bedLabel_key" ON "beds"("roomId", "bedLabel");
CREATE INDEX "beds_roomId_idx" ON "beds"("roomId");

-- Foreign key from beds to rooms
ALTER TABLE "beds" ADD CONSTRAINT "beds_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Safe Backfill: Create beds for any existing bed allocations first
INSERT INTO "beds" ("id", "roomId", "bedLabel", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), ba."roomId", ba."bedLabel", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "bed_allocations" ba
ON CONFLICT ("roomId", "bedLabel") DO NOTHING;

-- 3. Backfill beds for all existing rooms up to their capacity
INSERT INTO "beds" ("id", "roomId", "bedLabel", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), r."id", 'Bed ' || chr(64 + s.n), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "rooms" r
CROSS JOIN generate_series(1, 10) AS s(n)
WHERE s.n <= r."capacity"
ON CONFLICT ("roomId", "bedLabel") DO NOTHING;

-- 4. Add bedId column to bed_allocations
ALTER TABLE "bed_allocations" ADD COLUMN "bedId" UUID;

-- Map every existing bed_allocation to its corresponding bed
UPDATE "bed_allocations" ba
SET "bedId" = b."id"
FROM "beds" b
WHERE ba."roomId" = b."roomId" AND ba."bedLabel" = b."bedLabel";

-- Now enforce NOT NULL on bedId and adjust bedLabel size
ALTER TABLE "bed_allocations" ALTER COLUMN "bedId" SET NOT NULL;
ALTER TABLE "bed_allocations" ALTER COLUMN "bedLabel" TYPE VARCHAR(20);

-- Foreign key from bed_allocations to beds
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indices on bed_allocations
CREATE INDEX "bed_allocations_studentProfileId_idx" ON "bed_allocations"("studentProfileId");
CREATE INDEX "bed_allocations_bedId_idx" ON "bed_allocations"("bedId");

-- 5. Drop old unconditional unique constraint on studentProfileId to allow historical allocations
DROP INDEX IF EXISTS "bed_allocations_studentProfileId_key";

-- 6. Create PostgreSQL Partial Unique Indexes for concurrency protection and single active allocation rules
CREATE UNIQUE INDEX "unique_active_student_allocation"
ON "bed_allocations" ("studentProfileId")
WHERE "isActive" = true;

CREATE UNIQUE INDEX "unique_active_bed_allocation"
ON "bed_allocations" ("bedId")
WHERE "isActive" = true;
