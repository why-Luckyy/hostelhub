-- CreateEnum
CREATE TYPE "MessStaffRole" AS ENUM ('COOK', 'SERVER', 'CLEANING_STAFF', 'FOOD_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY');

-- CreateTable
CREATE TABLE "mess_staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "role" "MessStaffRole" NOT NULL,
    "phone" VARCHAR(20),
    "expectedStartTime" VARCHAR(5) NOT NULL DEFAULT '06:30',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mess_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staffId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "StaffAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "expectedStartTime" VARCHAR(5),
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "markedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mess_staff_role_idx" ON "mess_staff"("role");

-- CreateIndex
CREATE INDEX "mess_staff_isActive_idx" ON "mess_staff"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "staff_attendance_staffId_date_key" ON "staff_attendance"("staffId", "date");

-- CreateIndex
CREATE INDEX "staff_attendance_staffId_idx" ON "staff_attendance"("staffId");

-- CreateIndex
CREATE INDEX "staff_attendance_date_idx" ON "staff_attendance"("date");

-- CreateIndex
CREATE INDEX "staff_attendance_status_idx" ON "staff_attendance"("status");

-- AddForeignKey
ALTER TABLE "mess_staff" ADD CONSTRAINT "mess_staff_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "mess_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_markedByUserId_fkey" FOREIGN KEY ("markedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
