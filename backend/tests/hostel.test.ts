import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import { generateAccessToken } from '../src/services/authService';
import { ROLES, STUDENT_TYPES } from '../src/constants/roles';

describe('Phase 3: Hostel, Floor, Room, Bed & Allocation End-to-End Suite', () => {
  jest.setTimeout(60000);

  let wardenToken: string;
  let studentToken: string;
  let dayScholarToken: string;
  let messToken: string;

  let wardenUserId: string;
  let hostelerStudentProfileId: string;
  let dayScholarStudentProfileId: string;
  let hostelerUserId: string;

  const testSuffix = Date.now().toString().slice(-6);
  const testHostelCode = `TH-${testSuffix}`;
  const testHostelName = `Test Hostel ${testSuffix}`;

  let createdHostelId: string;
  let createdFloorId: string;
  let createdRoomId: string;
  let autoBedAId: string;
  let autoBedBId: string;
  let autoBedCId: string;

  beforeAll(async () => {
    // 1. Fetch seeded users
    const warden = await prisma.user.findUnique({
      where: { email: 'warden@hostelhub.edu' },
    });
    const mess = await prisma.user.findUnique({
      where: { email: 'mess@hostelhub.edu' },
    });
    const hosteler = await prisma.user.findUnique({
      where: { email: 'hosteler@hostelhub.edu' },
      include: { studentProfile: true },
    });
    const dayScholar = await prisma.user.findUnique({
      where: { email: 'dayscholar@hostelhub.edu' },
      include: { studentProfile: true },
    });

    if (!warden || !mess || !hosteler?.studentProfile || !dayScholar?.studentProfile) {
      throw new Error('Required seeded test accounts not found. Run seed first.');
    }

    wardenUserId = warden.id;
    hostelerStudentProfileId = hosteler.studentProfile.id;
    hostelerUserId = hosteler.id;
    dayScholarStudentProfileId = dayScholar.studentProfile.id;

    wardenToken = generateAccessToken({
      userId: warden.id,
      email: warden.email,
      role: ROLES.WARDEN,
    });

    messToken = generateAccessToken({
      userId: mess.id,
      email: mess.email,
      role: ROLES.MESS_INCHARGE,
    });

    studentToken = generateAccessToken({
      userId: hosteler.id,
      email: hosteler.email,
      role: ROLES.STUDENT,
      studentType: STUDENT_TYPES.HOSTELER,
    });

    dayScholarToken = generateAccessToken({
      userId: dayScholar.id,
      email: dayScholar.email,
      role: ROLES.STUDENT,
      studentType: STUDENT_TYPES.DAY_SCHOLAR,
    });
  });

  afterAll(async () => {
    // Clean up created test hostel hierarchy
    try {
      if (createdHostelId) {
        await prisma.bedAllocation.deleteMany({
          where: { room: { floor: { hostelId: createdHostelId } } },
        });
        await prisma.hostel.delete({
          where: { id: createdHostelId },
        });
      }
    } catch (e) {
      // Ignore cleanup error
    }
    await prisma.$disconnect();
  });

  // ----------------------------------------------------
  // 1. HOSTEL MANAGEMENT & RBAC
  // ----------------------------------------------------
  describe('1. Hostel Infrastructure Management', () => {
    it('Warden can create a new hostel block', async () => {
      const res = await request(app)
        .post('/api/v1/hostels')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          name: testHostelName,
          code: testHostelCode,
          genderAllowed: 'MALE',
          totalFloors: 3,
          description: 'Automated test residential block',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(testHostelName);
      expect(res.body.data.code).toBe(testHostelCode);
      createdHostelId = res.body.data.id;
    });

    it('Duplicate hostel code should be rejected with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/hostels')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          name: `${testHostelName} Duplicate`,
          code: testHostelCode,
          genderAllowed: 'MALE',
          totalFloors: 2,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('Student cannot create a hostel (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/hostels')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Unauthorized Hostel',
          code: 'UNAUTH-H',
          genderAllowed: 'MALE',
          totalFloors: 2,
        });

      expect(res.status).toBe(403);
    });

    it('Mess Incharge cannot create a hostel (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/hostels')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          name: 'Mess Unauthorized Hostel',
          code: 'MESS-H',
          genderAllowed: 'COED',
          totalFloors: 2,
        });

      expect(res.status).toBe(403);
    });

    it('Unauthenticated request cannot create a hostel (401 Unauthorized)', async () => {
      const res = await request(app).post('/api/v1/hostels').send({
        name: 'No Auth Hostel',
        code: 'NOAUTH-H',
        genderAllowed: 'COED',
        totalFloors: 2,
      });

      expect(res.status).toBe(401);
    });

    it('Authenticated users can list hostels with occupancy stats', async () => {
      const res = await request(app)
        .get('/api/v1/hostels')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const testHostel = res.body.data.find((h: any) => h.id === createdHostelId);
      expect(testHostel).toBeDefined();
      expect(testHostel.stats).toBeDefined();
    });

    it('Warden can view single hostel details and update info', async () => {
      const getRes = await request(app)
        .get(`/api/v1/hostels/${createdHostelId}`)
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.id).toBe(createdHostelId);

      const updateRes = await request(app)
        .put(`/api/v1/hostels/${createdHostelId}`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          description: 'Updated test description',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.description).toBe('Updated test description');
    });
  });

  // ----------------------------------------------------
  // 2. FLOOR OPERATIONS
  // ----------------------------------------------------
  describe('2. Floor Management', () => {
    it('Warden can create a floor inside the hostel', async () => {
      const res = await request(app)
        .post('/api/v1/floors')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          hostelId: createdHostelId,
          floorNumber: 1,
          floorName: 'Ground Floor Wing A',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.floorNumber).toBe(1);
      expect(res.body.data.hostelId).toBe(createdHostelId);
      createdFloorId = res.body.data.id;
    });

    it('Reject floor number exceeding totalFloors with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/floors')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          hostelId: createdHostelId,
          floorNumber: 15,
          floorName: 'Invalid Floor',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exceeds total floors');
    });

    it('Reject duplicate floor number in same hostel with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/floors')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          hostelId: createdHostelId,
          floorNumber: 1,
          floorName: 'Duplicate Floor 1',
        });

      expect(res.status).toBe(409);
    });

    it('Warden can view floors belonging to the hostel', async () => {
      const res = await request(app)
        .get(`/api/v1/floors/hostel/${createdHostelId}`)
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ----------------------------------------------------
  // 3. ROOM & BED CREATION RULES
  // ----------------------------------------------------
  describe('3. Room & Automatic Bed Creation Rules', () => {
    it('Creating a Room with capacity N automatically creates exactly N beds (Bed A, Bed B, Bed C)', async () => {
      const res = await request(app)
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          floorId: createdFloorId,
          roomNumber: '201',
          capacity: 3,
          roomType: 'NON_AC',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.roomNumber).toBe('201');
      expect(res.body.data.capacity).toBe(3);
      expect(res.body.data.occupancy).toBe(0);

      // Verify N beds were created
      expect(res.body.data.beds).toHaveLength(3);
      expect(res.body.data.beds.map((b: any) => b.bedLabel)).toEqual(['Bed A', 'Bed B', 'Bed C']);

      createdRoomId = res.body.data.id;
      autoBedAId = res.body.data.beds[0].id;
      autoBedBId = res.body.data.beds[1].id;
      autoBedCId = res.body.data.beds[2].id;
    });

    it('Duplicate room number on same floor rejected with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          floorId: createdFloorId,
          roomNumber: '201',
          capacity: 2,
        });

      expect(res.status).toBe(409);
    });

    it('Manual bed creation exceeding room capacity must be rejected with 400 Bad Request', async () => {
      // Room 201 has capacity 3 and already has 3 active beds (Bed A, B, C)
      const res = await request(app)
        .post('/api/v1/beds')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          roomId: createdRoomId,
          bedLabel: 'Bed D',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('capacity limit');
    });

    it('Physical Bed state: Inactive bed cannot be allocated', async () => {
      // Register a temporary unallocated hosteler
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `inactive.bed.test.${Date.now()}@hostelhub.edu`,
          password: 'Password@123',
          rollNumber: `ROLL_IB_${Date.now().toString().slice(-5)}`,
          firstName: 'Test',
          lastName: 'Hosteler',
          phone: '9876543199',
          studentType: STUDENT_TYPES.HOSTELER,
          department: 'Physics',
          yearOfStudy: 1,
          guardianName: 'Parent Test',
          guardianPhone: '9876543198',
        });

      const unallocatedHostelerId = reg.body.data.profile.id;

      // Mark Bed C physically inactive (e.g. broken / under repair)
      await request(app)
        .put(`/api/v1/beds/${autoBedCId}`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ isActive: false });

      // Try to allocate Bed C
      const allocRes = await request(app)
        .post('/api/v1/allocations')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: unallocatedHostelerId,
          bedId: autoBedCId,
        });

      expect(allocRes.status).toBe(400);
      expect(allocRes.body.message).toContain('physically inactive');

      // Re-activate Bed C for subsequent tests
      await request(app)
        .put(`/api/v1/beds/${autoBedCId}`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ isActive: true });
    });
  });

  // ----------------------------------------------------
  // 4. STUDENT ELIGIBILITY ENFORCEMENT
  // ----------------------------------------------------
  describe('4. Student Eligibility Enforcement (Server-Side)', () => {
    it('Day Scholar student MUST NOT be allocatable to a hostel bed (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/allocations')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: dayScholarStudentProfileId,
          bedId: autoBedAId,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only students with HOSTELER status are eligible');

      // Verify Day Scholar is still unallocated in database
      const profile = await prisma.studentProfile.findUnique({
        where: { id: dayScholarStudentProfileId },
      });
      expect(profile?.isAllocated).toBe(false);
    });
  });

  // ----------------------------------------------------
  // 5. ALLOCATION, VACATE, TRANSFER & TRANSACTIONAL OCCUPANCY
  // ----------------------------------------------------
  describe('5. Allocation, Vacate & Transfer Lifecycle', () => {
    let testStudentProfileId: string;
    let testStudentUserId: string;
    let testStudentToken: string;
    let allocationId: string;

    beforeAll(async () => {
      // Create a fresh unallocated Hosteler student for clean lifecycle testing
      const email = `lifecycle.student.${Date.now()}@hostelhub.edu`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Password@123',
          rollNumber: `ROLL_LC_${Date.now().toString().slice(-5)}`,
          firstName: 'Rohan',
          lastName: 'Mehta',
          phone: '9876543299',
          studentType: STUDENT_TYPES.HOSTELER,
          department: 'Mechanical',
          yearOfStudy: 1,
          guardianName: 'Sunil Mehta',
          guardianPhone: '9876543298',
        });

      testStudentProfileId = regRes.body.data.profile.id;
      testStudentUserId = regRes.body.data.user.id;
      testStudentToken = regRes.body.data.accessToken;
    });

    it('Student initially has no active bed allocation', async () => {
      const res = await request(app)
        .get('/api/v1/allocations/my-allocation')
        .set('Authorization', `Bearer ${testStudentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isAllocated).toBe(false);
      expect(res.body.data.allocation).toBeNull();
      expect(res.body.data.message).toBe('No hostel bed currently assigned.');
    });

    it('Warden can successfully allocate an eligible Hosteler to Bed A', async () => {
      const res = await request(app)
        .post('/api/v1/allocations')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: testStudentProfileId,
          bedId: autoBedAId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bedLabel).toBe('Bed A');
      expect(res.body.data.isActive).toBe(true);
      allocationId = res.body.data.id;

      // Verify Room Occupancy incremented transactionally
      const room = await prisma.room.findUnique({ where: { id: createdRoomId } });
      expect(room?.occupancy).toBe(1);

      // Verify Student marked as isAllocated
      const student = await prisma.studentProfile.findUnique({
        where: { id: testStudentProfileId },
      });
      expect(student?.isAllocated).toBe(true);
    });

    it('Student can now view their active allocation details', async () => {
      const res = await request(app)
        .get('/api/v1/allocations/my-allocation')
        .set('Authorization', `Bearer ${testStudentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isAllocated).toBe(true);
      expect(res.body.data.allocation.bedLabel).toBe('Bed A');
      expect(res.body.data.allocation.room.roomNumber).toBe('201');
      expect(res.body.data.allocation.room.floor.hostel.code).toBe(testHostelCode);
    });

    it('Attempting to allocate the same occupied Bed A to another student rejected with 409 Conflict', async () => {
      // Create a second Hosteler
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `second.student.${Date.now()}@hostelhub.edu`,
          password: 'Password@123',
          rollNumber: `ROLL_SEC_${Date.now().toString().slice(-5)}`,
          firstName: 'Vikas',
          lastName: 'Gupta',
          phone: '9876543277',
          studentType: STUDENT_TYPES.HOSTELER,
          department: 'Civil',
          yearOfStudy: 1,
          guardianName: 'Anand Gupta',
          guardianPhone: '9876543276',
        });

      const secondProfileId = regRes.body.data.profile.id;

      const res = await request(app)
        .post('/api/v1/allocations')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: secondProfileId,
          bedId: autoBedAId, // Bed A is already occupied by Rohan
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already occupied');
    });

    it('Attempting to allocate already-allocated student to Bed B rejected with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/allocations')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: testStudentProfileId, // Already allocated to Bed A
          bedId: autoBedBId,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already has an active bed allocation');
    });

    it('Warden can transfer student from Bed A to Bed B atomically', async () => {
      const res = await request(app)
        .post('/api/v1/allocations/transfer')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: testStudentProfileId,
          targetBedId: autoBedBId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bedLabel).toBe('Bed B');

      // Verify Bed A is now free
      const bedAAlloc = await prisma.bedAllocation.findFirst({
        where: { bedId: autoBedAId, isActive: true },
      });
      expect(bedAAlloc).toBeNull();

      // Verify Bed B is now occupied
      const bedBAlloc = await prisma.bedAllocation.findFirst({
        where: { bedId: autoBedBId, isActive: true },
      });
      expect(bedBAlloc).toBeDefined();
      expect(bedBAlloc?.studentProfileId).toBe(testStudentProfileId);

      // Verify room occupancy remains exactly 1
      const room = await prisma.room.findUnique({ where: { id: createdRoomId } });
      expect(room?.occupancy).toBe(1);
    });

    it('Warden can vacate student allocation while preserving historical records', async () => {
      const res = await request(app)
        .post('/api/v1/allocations/vacate')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: testStudentProfileId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify bed is now available
      const bedBAlloc = await prisma.bedAllocation.findFirst({
        where: { bedId: autoBedBId, isActive: true },
      });
      expect(bedBAlloc).toBeNull();

      // Verify room occupancy decremented to 0
      const room = await prisma.room.findUnique({ where: { id: createdRoomId } });
      expect(room?.occupancy).toBe(0);

      // Verify student profile is marked unallocated
      const student = await prisma.studentProfile.findUnique({
        where: { id: testStudentProfileId },
      });
      expect(student?.isAllocated).toBe(false);

      // CRITICAL CHECK: Verify history is retained (past allocations exist with isActive = false)
      const historicalAllocations = await prisma.bedAllocation.findMany({
        where: { studentProfileId: testStudentProfileId },
      });
      expect(historicalAllocations.length).toBe(2); // 1 for Bed A (transferred), 1 for Bed B (vacated)
      historicalAllocations.forEach((alloc) => {
        expect(alloc.isActive).toBe(false);
        expect(alloc.allocatedTo).not.toBeNull();
      });
    });
  });

  // ----------------------------------------------------
  // 6. CONCURRENCY & RACE CONDITION PROTECTION
  // ----------------------------------------------------
  describe('6. Concurrency & Race Condition Protection', () => {
    let concurrentStudent1Id: string;
    let concurrentStudent2Id: string;

    beforeAll(async () => {
      // Register two fresh hosteler students
      const reg1 = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `conc.student1.${Date.now()}@hostelhub.edu`,
          password: 'Password@123',
          rollNumber: `ROLL_C1_${Date.now().toString().slice(-5)}`,
          firstName: 'Candidate',
          lastName: 'One',
          phone: '9876543111',
          studentType: STUDENT_TYPES.HOSTELER,
          department: 'IT',
          yearOfStudy: 1,
          guardianName: 'Guardian One',
          guardianPhone: '9876543112',
        });
      concurrentStudent1Id = reg1.body.data.profile.id;

      const reg2 = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `conc.student2.${Date.now()}@hostelhub.edu`,
          password: 'Password@123',
          rollNumber: `ROLL_C2_${Date.now().toString().slice(-5)}`,
          firstName: 'Candidate',
          lastName: 'Two',
          phone: '9876543222',
          studentType: STUDENT_TYPES.HOSTELER,
          department: 'IT',
          yearOfStudy: 1,
          guardianName: 'Guardian Two',
          guardianPhone: '9876543223',
        });
      concurrentStudent2Id = reg2.body.data.profile.id;
    });

    it('Simultaneous allocation attempts for the same Bed C: Exactly one succeeds (201) and one receives controlled conflict (409)', async () => {
      // AutoBedC is completely vacant. Two requests try to claim it simultaneously.
      const req1 = request(app)
        .post('/api/v1/allocations')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: concurrentStudent1Id,
          bedId: autoBedCId,
        });

      const req2 = request(app)
        .post('/api/v1/allocations')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: concurrentStudent2Id,
          bedId: autoBedCId,
        });

      const [res1, res2] = await Promise.all([req1, req2]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      // Database verification: Only 1 active allocation exists for Bed C
      const activeAllocationsForBedC = await prisma.bedAllocation.findMany({
        where: { bedId: autoBedCId, isActive: true },
      });
      expect(activeAllocationsForBedC).toHaveLength(1);
    });
  });
});
