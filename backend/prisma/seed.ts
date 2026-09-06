import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { PrismaClient, UserRole, StudentType, GenderAllowed, RoomType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Common hashed passwords
  const adminPasswordHash = await bcrypt.hash('Warden@123', 12);
  const messPasswordHash = await bcrypt.hash('Mess@123', 12);
  const studentPasswordHash = await bcrypt.hash('Student@123', 12);

  // 1. Create Warden / Admin User
  const warden = await prisma.user.upsert({
    where: { email: 'warden@hostelhub.edu' },
    update: {},
    create: {
      email: 'warden@hostelhub.edu',
      passwordHash: adminPasswordHash,
      role: UserRole.WARDEN,
      isActive: true,
    },
  });
  console.log('✅ Created Warden account:', warden.email);

  // 2. Create Mess Incharge User
  const messIncharge = await prisma.user.upsert({
    where: { email: 'mess@hostelhub.edu' },
    update: {},
    create: {
      email: 'mess@hostelhub.edu',
      passwordHash: messPasswordHash,
      role: UserRole.MESS_INCHARGE,
      isActive: true,
    },
  });
  console.log('✅ Created Mess Incharge account:', messIncharge.email);

  // 3. Create Sample Hostel, Floor, and Rooms
  const hostel = await prisma.hostel.upsert({
    where: { code: 'KB-A' },
    update: {},
    create: {
      name: 'Kaveri Hostel Block A',
      code: 'KB-A',
      genderAllowed: GenderAllowed.MALE,
      totalFloors: 3,
      description: 'Standard undergraduate boys residential block',
      isActive: true,
      floors: {
        create: {
          floorNumber: 1,
          floorName: '1st Floor - Wing East',
          rooms: {
            create: [
              { roomNumber: '101', capacity: 2, occupancy: 1, roomType: RoomType.NON_AC },
              { roomNumber: '102', capacity: 3, occupancy: 0, roomType: RoomType.NON_AC },
            ],
          },
        },
      },
    },
    include: {
      floors: {
        include: {
          rooms: true,
        },
      },
    },
  });
  console.log('✅ Created Hostel block:', hostel.name);

  // Ensure rooms and beds exist
  const room101 = await prisma.room.findFirst({
    where: { floor: { hostelId: hostel.id }, roomNumber: '101' },
  });
  const room102 = await prisma.room.findFirst({
    where: { floor: { hostelId: hostel.id }, roomNumber: '102' },
  });

  if (room101) {
    await prisma.bed.upsert({
      where: { roomId_bedLabel: { roomId: room101.id, bedLabel: 'Bed A' } },
      update: {},
      create: { roomId: room101.id, bedLabel: 'Bed A', isActive: true },
    });
    await prisma.bed.upsert({
      where: { roomId_bedLabel: { roomId: room101.id, bedLabel: 'Bed B' } },
      update: {},
      create: { roomId: room101.id, bedLabel: 'Bed B', isActive: true },
    });
  }

  if (room102) {
    await prisma.bed.upsert({
      where: { roomId_bedLabel: { roomId: room102.id, bedLabel: 'Bed A' } },
      update: {},
      create: { roomId: room102.id, bedLabel: 'Bed A', isActive: true },
    });
    await prisma.bed.upsert({
      where: { roomId_bedLabel: { roomId: room102.id, bedLabel: 'Bed B' } },
      update: {},
      create: { roomId: room102.id, bedLabel: 'Bed B', isActive: true },
    });
    await prisma.bed.upsert({
      where: { roomId_bedLabel: { roomId: room102.id, bedLabel: 'Bed C' } },
      update: {},
      create: { roomId: room102.id, bedLabel: 'Bed C', isActive: true },
    });
  }

  // 4. Create Hosteler Student
  const hostelerUser = await prisma.user.upsert({
    where: { email: 'hosteler@hostelhub.edu' },
    update: {},
    create: {
      email: 'hosteler@hostelhub.edu',
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
      isActive: true,
      studentProfile: {
        create: {
          rollNumber: '2024CS001',
          firstName: 'Aman',
          lastName: 'Sharma',
          phone: '+919876543210',
          studentType: StudentType.HOSTELER,
          department: 'Computer Science',
          yearOfStudy: 2,
          guardianName: 'Rajesh Sharma',
          guardianPhone: '+919876543211',
          guardianEmail: 'rajesh.sharma@example.com',
          isAllocated: true,
        },
      },
    },
    include: { studentProfile: true },
  });
  console.log('✅ Created Hosteler Student account:', hostelerUser.email);

  // Link allocation for Hosteler student if not already present
  if (hostelerUser.studentProfile && room101) {
    const bedA = await prisma.bed.findUnique({
      where: { roomId_bedLabel: { roomId: room101.id, bedLabel: 'Bed A' } },
    });
    if (bedA) {
      const existingAlloc = await prisma.bedAllocation.findFirst({
        where: { studentProfileId: hostelerUser.studentProfile.id, isActive: true },
      });
      if (!existingAlloc) {
        await prisma.bedAllocation.create({
          data: {
            studentProfileId: hostelerUser.studentProfile.id,
            roomId: room101.id,
            bedId: bedA.id,
            bedLabel: 'Bed A',
            allocatedByAdminId: warden.id,
            isActive: true,
          },
        });
      }
    }
  }

  // 5. Create Day Scholar Student
  const dayScholarUser = await prisma.user.upsert({
    where: { email: 'dayscholar@hostelhub.edu' },
    update: {},
    create: {
      email: 'dayscholar@hostelhub.edu',
      passwordHash: studentPasswordHash,
      role: UserRole.STUDENT,
      isActive: true,
      studentProfile: {
        create: {
          rollNumber: '2024CS002',
          firstName: 'Priya',
          lastName: 'Verma',
          phone: '+919876543220',
          studentType: StudentType.DAY_SCHOLAR,
          department: 'Electronics & Communication',
          yearOfStudy: 3,
          guardianName: 'Suresh Verma',
          guardianPhone: '+919876543221',
          guardianEmail: 'suresh.verma@example.com',
          isAllocated: false,
        },
      },
    },
  });
  console.log('✅ Created Day Scholar Student account:', dayScholarUser.email);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
