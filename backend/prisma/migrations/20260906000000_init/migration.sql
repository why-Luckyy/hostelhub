-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'WARDEN', 'MESS_INCHARGE');

-- CreateEnum
CREATE TYPE "StudentType" AS ENUM ('HOSTELER', 'DAY_SCHOLAR');

-- CreateEnum
CREATE TYPE "GenderAllowed" AS ENUM ('MALE', 'FEMALE', 'COED');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('AC', 'NON_AC');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('ELECTRICAL', 'PLUMBING', 'CARPENTRY', 'CLEANLINESS', 'INTERNET', 'MESS', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplaintPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('NONE', 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS');

-- CreateEnum
CREATE TYPE "NoticeCategory" AS ENUM ('GENERAL', 'HOSTEL', 'MESS', 'URGENT', 'EVENT');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('ALL', 'HOSTELERS', 'DAY_SCHOLARS');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'LEAVE', 'GUEST', 'COMPLAINT', 'NOTICE', 'MESS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "studentType" "StudentType" NOT NULL DEFAULT 'HOSTELER',
    "department" VARCHAR(100) NOT NULL,
    "yearOfStudy" INTEGER NOT NULL,
    "guardianName" VARCHAR(100) NOT NULL,
    "guardianPhone" VARCHAR(20) NOT NULL,
    "guardianEmail" VARCHAR(255),
    "isAllocated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostels" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "genderAllowed" "GenderAllowed" NOT NULL,
    "totalFloors" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hostels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" UUID NOT NULL,
    "hostelId" UUID NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "floorName" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "floorId" UUID NOT NULL,
    "roomNumber" VARCHAR(20) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "occupancy" INTEGER NOT NULL DEFAULT 0,
    "roomType" "RoomType" NOT NULL DEFAULT 'NON_AC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_allocations" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "bedLabel" VARCHAR(10) NOT NULL,
    "allocatedFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocatedTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allocatedByAdminId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bed_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ComplaintCategory" NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" "ComplaintPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignedTo" VARCHAR(100),
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_attachments" (
    "id" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "destination" VARCHAR(255) NOT NULL,
    "emergencyContact" VARCHAR(20) NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByAdminId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_requests" (
    "id" UUID NOT NULL,
    "hostStudentProfileId" UUID NOT NULL,
    "guestName" VARCHAR(100) NOT NULL,
    "relationship" VARCHAR(50) NOT NULL,
    "visitDate" DATE NOT NULL,
    "requestedMeal" "MealType" NOT NULL DEFAULT 'NONE',
    "numberOfGuests" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "status" "GuestStatus" NOT NULL DEFAULT 'PENDING',
    "passNumber" VARCHAR(30),
    "reviewedByAdminId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_passes" (
    "id" UUID NOT NULL,
    "guestRequestId" UUID NOT NULL,
    "passCode" VARCHAR(30) NOT NULL,
    "validOn" DATE NOT NULL,
    "isVerifiedAtGate" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "category" "NoticeCategory" NOT NULL DEFAULT 'GENERAL',
    "targetAudience" "AudienceType" NOT NULL DEFAULT 'ALL',
    "targetHostelId" UUID,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedByAdminId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_menus" (
    "id" UUID NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "mealType" "MealType" NOT NULL,
    "items" TEXT NOT NULL,
    "specialNotes" TEXT,
    "updatedByUserId" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mess_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_feedbacks" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "mealDate" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "rating" INTEGER NOT NULL,
    "foodQualityRating" INTEGER NOT NULL,
    "cleanlinessRating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_geofences" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campus_geofences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_presence_logs" (
    "id" UUID NOT NULL,
    "studentProfileId" UUID NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "accuracyMeters" DOUBLE PRECISION,
    "calculatedDistance" DOUBLE PRECISION NOT NULL,
    "isInside" BOOLEAN NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campus_presence_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(100),
    "details" TEXT,
    "ipAddress" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_userId_key" ON "student_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_rollNumber_key" ON "student_profiles"("rollNumber");

-- CreateIndex
CREATE INDEX "student_profiles_rollNumber_idx" ON "student_profiles"("rollNumber");

-- CreateIndex
CREATE INDEX "student_profiles_studentType_idx" ON "student_profiles"("studentType");

-- CreateIndex
CREATE UNIQUE INDEX "hostels_name_key" ON "hostels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hostels_code_key" ON "hostels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "floors_hostelId_floorNumber_key" ON "floors"("hostelId", "floorNumber");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_floorId_roomNumber_key" ON "rooms"("floorId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "bed_allocations_studentProfileId_key" ON "bed_allocations"("studentProfileId");

-- CreateIndex
CREATE INDEX "bed_allocations_roomId_idx" ON "bed_allocations"("roomId");

-- CreateIndex
CREATE INDEX "bed_allocations_isActive_idx" ON "bed_allocations"("isActive");

-- CreateIndex
CREATE INDEX "complaints_studentProfileId_idx" ON "complaints"("studentProfileId");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_category_idx" ON "complaints"("category");

-- CreateIndex
CREATE INDEX "complaint_attachments_complaintId_idx" ON "complaint_attachments"("complaintId");

-- CreateIndex
CREATE INDEX "leave_requests_studentProfileId_idx" ON "leave_requests"("studentProfileId");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_startDate_endDate_idx" ON "leave_requests"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "guest_requests_passNumber_key" ON "guest_requests"("passNumber");

-- CreateIndex
CREATE INDEX "guest_requests_hostStudentProfileId_idx" ON "guest_requests"("hostStudentProfileId");

-- CreateIndex
CREATE INDEX "guest_requests_visitDate_idx" ON "guest_requests"("visitDate");

-- CreateIndex
CREATE INDEX "guest_requests_status_idx" ON "guest_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "guest_passes_guestRequestId_key" ON "guest_passes"("guestRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_passes_passCode_key" ON "guest_passes"("passCode");

-- CreateIndex
CREATE INDEX "guest_passes_passCode_idx" ON "guest_passes"("passCode");

-- CreateIndex
CREATE INDEX "notices_targetAudience_idx" ON "notices"("targetAudience");

-- CreateIndex
CREATE INDEX "notices_category_idx" ON "notices"("category");

-- CreateIndex
CREATE INDEX "notices_isPinned_idx" ON "notices"("isPinned");

-- CreateIndex
CREATE UNIQUE INDEX "mess_menus_dayOfWeek_mealType_key" ON "mess_menus"("dayOfWeek", "mealType");

-- CreateIndex
CREATE INDEX "mess_feedbacks_studentProfileId_idx" ON "mess_feedbacks"("studentProfileId");

-- CreateIndex
CREATE INDEX "mess_feedbacks_mealDate_idx" ON "mess_feedbacks"("mealDate");

-- CreateIndex
CREATE INDEX "campus_presence_logs_studentProfileId_idx" ON "campus_presence_logs"("studentProfileId");

-- CreateIndex
CREATE INDEX "campus_presence_logs_isInside_idx" ON "campus_presence_logs"("isInside");

-- CreateIndex
CREATE INDEX "campus_presence_logs_recordedAt_idx" ON "campus_presence_logs"("recordedAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_allocatedByAdminId_fkey" FOREIGN KEY ("allocatedByAdminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_hostStudentProfileId_fkey" FOREIGN KEY ("hostStudentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_passes" ADD CONSTRAINT "guest_passes_guestRequestId_fkey" FOREIGN KEY ("guestRequestId") REFERENCES "guest_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_publishedByAdminId_fkey" FOREIGN KEY ("publishedByAdminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_targetHostelId_fkey" FOREIGN KEY ("targetHostelId") REFERENCES "hostels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_menus" ADD CONSTRAINT "mess_menus_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_feedbacks" ADD CONSTRAINT "mess_feedbacks_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_presence_logs" ADD CONSTRAINT "campus_presence_logs_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

