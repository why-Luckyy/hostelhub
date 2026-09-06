-- CreateEnum
CREATE TYPE "FineStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateTable
CREATE TABLE "fines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "studentProfileId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "FineStatus" NOT NULL DEFAULT 'UNPAID',
    "assignedByAdminId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fines_studentProfileId_idx" ON "fines"("studentProfileId");

-- CreateIndex
CREATE INDEX "fines_status_idx" ON "fines"("status");

-- CreateIndex
CREATE INDEX "fines_assignedAt_idx" ON "fines"("assignedAt");

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_assignedByAdminId_fkey" FOREIGN KEY ("assignedByAdminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
