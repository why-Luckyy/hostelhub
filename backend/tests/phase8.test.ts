import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import { generateAccessToken } from '../src/services/authService';
import { ROLES } from '../src/constants/roles';
import { getKolkataDateInfo } from '../src/services/staffService';

describe('Phase 8: Mess Staff Attendance End-to-End Suite', () => {
  jest.setTimeout(60000);

  let messToken: string;
  let wardenToken: string;
  let studentToken: string;

  let messUserId: string;
  let wardenUserId: string;
  let studentUserId: string;

  // Cleanup tracking arrays
  const createdStaffIds: string[] = [];
  const createdAttendanceIds: string[] = [];
  const createdAuditLogIds: string[] = [];
  const createdNotificationIds: string[] = [];

  // Reusable test staff IDs
  let cookStaffId: string;
  let serverStaffId: string;
  let cleanerStaffId: string;

  beforeAll(async () => {
    // Fetch seeded accounts
    const mess = await prisma.user.findUnique({
      where: { email: 'mess@hostelhub.edu' },
    });
    const warden = await prisma.user.findUnique({
      where: { email: 'warden@hostelhub.edu' },
    });
    const student = await prisma.user.findUnique({
      where: { email: 'hosteler@hostelhub.edu' },
    });

    if (!mess || !warden || !student) {
      throw new Error('Required seeded accounts not found in database.');
    }

    messUserId = mess.id;
    wardenUserId = warden.id;
    studentUserId = student.id;

    messToken = generateAccessToken({
      userId: mess.id,
      email: mess.email,
      role: ROLES.MESS_INCHARGE,
    });

    wardenToken = generateAccessToken({
      userId: warden.id,
      email: warden.email,
      role: ROLES.WARDEN,
    });

    studentToken = generateAccessToken({
      userId: student.id,
      email: student.email,
      role: ROLES.STUDENT,
    });
  });

  afterAll(async () => {
    try {
      if (createdAttendanceIds.length > 0) {
        await prisma.staffAttendance.deleteMany({
          where: { id: { in: createdAttendanceIds } },
        });
      }
      if (createdStaffIds.length > 0) {
        await prisma.messStaff.deleteMany({
          where: { id: { in: createdStaffIds } },
        });
      }
      if (createdNotificationIds.length > 0) {
        await prisma.notification.deleteMany({
          where: { id: { in: createdNotificationIds } },
        });
      }
      if (createdAuditLogIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: { id: { in: createdAuditLogIds } },
        });
      }
    } catch (err) {
      console.log('Teardown notice:', err);
    }
  });

  // =========================================================================
  // 1. STAFF ENROLLMENT & MANAGEMENT MODULE
  // =========================================================================
  describe('1. Mess Staff Management Module', () => {
    it('1.1 should allow Mess Incharge to enroll new operational mess staff', async () => {
      const res = await request(app)
        .post('/api/v1/mess/staff')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          name: 'Ramesh Kumar (Head Cook)',
          role: 'COOK',
          phone: '+919876540001',
          expectedStartTime: '06:00',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Ramesh Kumar (Head Cook)');
      expect(res.body.data.role).toBe('COOK');
      expect(res.body.data.expectedStartTime).toBe('06:00');
      expect(res.body.data.isActive).toBe(true);

      cookStaffId = res.body.data.id;
      createdStaffIds.push(cookStaffId);

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: { entityId: cookStaffId, action: 'STAFF_CREATED' },
      });
      expect(audit).not.toBeNull();
      if (audit) createdAuditLogIds.push(audit.id);
    });

    it('1.2 should create additional staff members for servers and cleaners', async () => {
      const resServer = await request(app)
        .post('/api/v1/mess/staff')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          name: 'Suresh Patel',
          role: 'SERVER',
          expectedStartTime: '07:00',
        });
      expect(resServer.status).toBe(201);
      serverStaffId = resServer.body.data.id;
      createdStaffIds.push(serverStaffId);

      const resCleaner = await request(app)
        .post('/api/v1/mess/staff')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          name: 'Manish Verma',
          role: 'CLEANING_STAFF',
          expectedStartTime: '08:00',
        });
      expect(resCleaner.status).toBe(201);
      cleanerStaffId = resCleaner.body.data.id;
      createdStaffIds.push(cleanerStaffId);
    });

    it('1.3 should allow Mess Incharge and Warden to list staff with filters', async () => {
      const resMess = await request(app)
        .get('/api/v1/mess/staff?role=COOK')
        .set('Authorization', `Bearer ${messToken}`);
      expect(resMess.status).toBe(200);
      expect(resMess.body.data.some((s: any) => s.id === cookStaffId)).toBe(true);

      const resWarden = await request(app)
        .get('/api/v1/mess/staff')
        .set('Authorization', `Bearer ${wardenToken}`);
      expect(resWarden.status).toBe(200);
      expect(Array.isArray(resWarden.body.data)).toBe(true);
    });

    it('1.4 should allow Mess Incharge to update staff profile and shift time', async () => {
      const res = await request(app)
        .put(`/api/v1/mess/staff/${cookStaffId}`)
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          expectedStartTime: '06:30',
          phone: '+919876549999',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.expectedStartTime).toBe('06:30');
      expect(res.body.data.phone).toBe('+919876549999');
    });

    it('1.5 should allow Mess Incharge to toggle active/inactive status', async () => {
      const resDeactivate = await request(app)
        .patch(`/api/v1/mess/staff/${cleanerStaffId}/status`)
        .set('Authorization', `Bearer ${messToken}`)
        .send({ isActive: false });

      expect(resDeactivate.status).toBe(200);
      expect(resDeactivate.body.data.isActive).toBe(false);

      // Reactivate
      const resReactivate = await request(app)
        .patch(`/api/v1/mess/staff/${cleanerStaffId}/status`)
        .set('Authorization', `Bearer ${messToken}`)
        .send({ isActive: true });

      expect(resReactivate.status).toBe(200);
      expect(resReactivate.body.data.isActive).toBe(true);
    });

    it('1.6 should forbid Warden from creating or updating staff (403)', async () => {
      const resCreate = await request(app)
        .post('/api/v1/mess/staff')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          name: 'Unauthorized Staff',
          role: 'SERVER',
        });
      expect(resCreate.status).toBe(403);

      const resUpdate = await request(app)
        .put(`/api/v1/mess/staff/${cookStaffId}`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ name: 'Hacked Name' });
      expect(resUpdate.status).toBe(403);
    });

    it('1.7 should forbid Student from accessing mess staff endpoints (403)', async () => {
      const resList = await request(app)
        .get('/api/v1/mess/staff')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(resList.status).toBe(403);
    });

    it('1.8 should reject invalid staff inputs (422)', async () => {
      const resInvalidTime = await request(app)
        .post('/api/v1/mess/staff')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          name: 'Bad Time Staff',
          role: 'COOK',
          expectedStartTime: '25:99', // Invalid 24h format
        });
      expect(resInvalidTime.status).toBe(422);

      const resInvalidRole = await request(app)
        .post('/api/v1/mess/staff')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          name: 'Bad Role Staff',
          role: 'MANAGER', // Not in enum
        });
      expect(resInvalidRole.status).toBe(422);
    });
  });

  // =========================================================================
  // 2. DAILY ATTENDANCE CHECK-IN & PUNCTUALITY MODULE
  // =========================================================================
  describe('2. Daily Attendance Check-In & Punctuality', () => {
    it('2.1 should mark staff ON-TIME when arriving before expectedStartTime + grace period', async () => {
      // Cook shift is 06:30. Check-in at 06:25 (on-time)
      const { dateOnlyStr } = getKolkataDateInfo();
      const checkInTime = new Date(`${dateOnlyStr}T06:25:00+05:30`);

      const res = await request(app)
        .post('/api/v1/mess/staff/attendance/check-in')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          staffId: cookStaffId,
          checkInTime: checkInTime.toISOString(),
          remarks: 'Morning shift prep',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PRESENT');
      expect(res.body.data.isLate).toBe(false);
      expect(res.body.data.lateMinutes).toBe(0);
      expect(res.body.data.staffId).toBe(cookStaffId);

      createdAttendanceIds.push(res.body.data.id);
    });

    it('2.2 should mark staff LATE when arriving after expectedStartTime + 15 min grace', async () => {
      // Server shift is 07:00. Check-in at 07:45 (+45 mins late)
      const { dateOnlyStr } = getKolkataDateInfo();
      const checkInTime = new Date(`${dateOnlyStr}T07:45:00+05:30`);

      const res = await request(app)
        .post('/api/v1/mess/staff/attendance/check-in')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          staffId: serverStaffId,
          checkInTime: checkInTime.toISOString(),
          remarks: 'Delayed due to bus',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('LATE');
      expect(res.body.data.isLate).toBe(true);
      expect(res.body.data.lateMinutes).toBe(45);

      createdAttendanceIds.push(res.body.data.id);
    });

    it('2.3 should prevent duplicate check-in for the same staff member on the same date (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/mess/staff/attendance/check-in')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          staffId: cookStaffId, // Already checked in today in test 2.1
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already been recorded');
    });

    it('2.4 should reject check-in for an inactive staff member', async () => {
      // Create and deactivate a temporary staff
      const tempStaff = await prisma.messStaff.create({
        data: {
          name: 'Inactive Staff Test',
          role: 'OTHER',
          isActive: false,
          createdByUserId: messUserId,
        },
      });
      createdStaffIds.push(tempStaff.id);

      const res = await request(app)
        .post('/api/v1/mess/staff/attendance/check-in')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          staffId: tempStaff.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('inactive staff member');
    });
  });

  // =========================================================================
  // 3. CHECK-OUT & MANUAL ATTENDANCE OVERRIDE MODULE
  // =========================================================================
  describe('3. Check-Out & Attendance Overrides', () => {
    it('3.1 should allow Mess Incharge to record check-out time for a checked-in staff member', async () => {
      const res = await request(app)
        .post('/api/v1/mess/staff/attendance/check-out')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          staffId: cookStaffId,
          remarks: 'Shift completed cleanly',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.checkOutTime).not.toBeNull();
      expect(res.body.data.remarks).toContain('Shift completed cleanly');
    });

    it('3.2 should reject duplicate check-out attempts for the same worker (400)', async () => {
      const res = await request(app)
        .post('/api/v1/mess/staff/attendance/check-out')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          staffId: cookStaffId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already checked out');
    });

    it('3.3 should reject check-out for a staff member who has not checked in today (400)', async () => {
      const res = await request(app)
        .post('/api/v1/mess/staff/attendance/check-out')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          staffId: cleanerStaffId, // Not checked in yet
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No check-in record found');
    });

    it('3.4 should allow Mess Incharge to explicitly mark attendance as ABSENT or HALF_DAY', async () => {
      const resAbsent = await request(app)
        .post('/api/v1/mess/staff/attendance/mark')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          staffId: cleanerStaffId,
          status: 'ABSENT',
          remarks: 'Sick leave informed via phone',
        });

      expect(resAbsent.status).toBe(201);
      expect(resAbsent.body.data.status).toBe('ABSENT');
      expect(resAbsent.body.data.isLate).toBe(false);

      createdAttendanceIds.push(resAbsent.body.data.id);
    });

    it('3.5 should create in-app notification when a Cook is marked ABSENT', async () => {
      // Create a temporary cook and mark absent
      const tempCook = await prisma.messStaff.create({
        data: {
          name: 'Assistant Cook Test',
          role: 'COOK',
          expectedStartTime: '06:00',
          isActive: true,
          createdByUserId: messUserId,
        },
      });
      createdStaffIds.push(tempCook.id);

      const res = await request(app)
        .post('/api/v1/mess/staff/attendance/mark')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          staffId: tempCook.id,
          status: 'ABSENT',
          remarks: 'Uninformed absence',
        });

      expect(res.status).toBe(201);
      createdAttendanceIds.push(res.body.data.id);

      // Verify notification was generated for Mess Incharge
      const notification = await prisma.notification.findFirst({
        where: {
          userId: messUserId,
          title: { contains: 'Cook Marked Absent' },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(notification).not.toBeNull();
      expect(notification?.message).toContain('Assistant Cook Test');
      if (notification) createdNotificationIds.push(notification.id);
    });
  });

  // =========================================================================
  // 4. DAILY ROSTER & HISTORICAL REPORTING MODULE
  // =========================================================================
  describe('4. Daily Roster & Historical Reporting', () => {
    it('4.1 should return today roster with accurate headcount breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/mess/staff/attendance/today')
        .set('Authorization', `Bearer ${messToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalActiveStaff).toBeGreaterThanOrEqual(3);
      expect(res.body.data.presentCount).toBeGreaterThanOrEqual(1); // Cook from 2.1
      expect(res.body.data.lateCount).toBeGreaterThanOrEqual(1); // Server from 2.2
      expect(res.body.data.absentCount).toBeGreaterThanOrEqual(1); // Cleaner from 3.4
      expect(Array.isArray(res.body.data.records)).toBe(true);
    });

    it('4.2 should allow Warden to view today roster in read-only mode', async () => {
      const res = await request(app)
        .get('/api/v1/mess/staff/attendance/today')
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.records).toBeDefined();
    });

    it('4.3 should return aggregate attendance summary statistics', async () => {
      const res = await request(app)
        .get('/api/v1/mess/staff/attendance/summary')
        .set('Authorization', `Bearer ${messToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalRecords).toBeGreaterThanOrEqual(3);
      expect(res.body.data.presentCount).toBeDefined();
      expect(res.body.data.lateCount).toBeDefined();
      expect(res.body.data.onTimePercentage).toBeDefined();
    });

    it('4.4 should return paginated historical attendance queryable by role and status', async () => {
      const res = await request(app)
        .get('/api/v1/mess/staff/attendance/history?role=COOK&page=1&limit=10')
        .set('Authorization', `Bearer ${messToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.every((r: any) => r.staff.role === 'COOK')).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });

  // =========================================================================
  // 5. SECURITY, RBAC & UNAUTHENTICATED GUARDS
  // =========================================================================
  describe('5. Security, RBAC & Role Boundaries', () => {
    it('5.1 should return 401 Unauthorized for unauthenticated requests', async () => {
      const res1 = await request(app).get('/api/v1/mess/staff');
      expect(res1.status).toBe(401);

      const res2 = await request(app).post('/api/v1/mess/staff/attendance/check-in').send({});
      expect(res2.status).toBe(401);

      const res3 = await request(app).get('/api/v1/mess/staff/attendance/today');
      expect(res3.status).toBe(401);
    });

    it('5.2 should forbid Students from all mess staff and attendance endpoints (403)', async () => {
      const res1 = await request(app)
        .get('/api/v1/mess/staff')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .get('/api/v1/mess/staff/attendance/today')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res2.status).toBe(403);

      const res3 = await request(app)
        .post('/api/v1/mess/staff/attendance/check-in')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ staffId: cookStaffId });
      expect(res3.status).toBe(403);
    });

    it('5.3 should forbid Warden from modifying staff attendance (403)', async () => {
      const resCheckIn = await request(app)
        .post('/api/v1/mess/staff/attendance/check-in')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ staffId: cookStaffId });
      expect(resCheckIn.status).toBe(403);

      const resMark = await request(app)
        .post('/api/v1/mess/staff/attendance/mark')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ staffId: cookStaffId, status: 'PRESENT' });
      expect(resMark.status).toBe(403);
    });
  });
});
