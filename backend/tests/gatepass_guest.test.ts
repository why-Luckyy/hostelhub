import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import { generateAccessToken } from '../src/services/authService';
import { generateSecurePassCode } from '../src/services/guestService';
import { ROLES, STUDENT_TYPES } from '../src/constants/roles';
import { LeaveStatus, GuestStatus, NotificationType } from '@prisma/client';

describe('Phase 4: Gate Pass & Guest Management End-to-End Suite', () => {
  jest.setTimeout(60000);

  let wardenToken: string;
  let studentToken: string;
  let dayScholarToken: string;
  let messToken: string;

  let wardenUserId: string;
  let hostelerStudentProfileId: string;
  let dayScholarStudentProfileId: string;
  let hostelerUserId: string;
  let dayScholarUserId: string;

  // Track created IDs for selective cleanup
  const createdLeaveIds: string[] = [];
  const createdGuestRequestIds: string[] = [];

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
    dayScholarUserId = dayScholar.id;

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
    try {
      if (createdLeaveIds.length > 0) {
        await prisma.leaveRequest.deleteMany({
          where: { id: { in: createdLeaveIds } },
        });
      }
      if (createdGuestRequestIds.length > 0) {
        await prisma.guestPass.deleteMany({
          where: { guestRequestId: { in: createdGuestRequestIds } },
        });
        await prisma.guestRequest.deleteMany({
          where: { id: { in: createdGuestRequestIds } },
        });
      }
    } catch (e) {
      // Ignore cleanup error
    }
    await prisma.$disconnect();
  });

  // ----------------------------------------------------
  // 1. DAY SCHOLAR RULE & STUDENT ELIGIBILITY
  // ----------------------------------------------------
  describe('1. Day Scholar Eligibility & Server-Side Derivation', () => {
    it('Normal Day Scholar without temporary authorization CANNOT submit gate-pass request (400)', async () => {
      const start = new Date(Date.now() + 86400000).toISOString();
      const end = new Date(Date.now() + 172800000).toISOString();

      const res = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${dayScholarToken}`)
        .send({
          startDate: start,
          endDate: end,
          destination: 'Home',
          emergencyContact: '+919876543221',
          reason: 'Weekend visit to home town',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Day Scholar students without valid temporary hostel residential authorization');
    });

    it('Client attempting to override studentType in request payload is strictly ignored/rejected server-side', async () => {
      const start = new Date(Date.now() + 86400000).toISOString();
      const end = new Date(Date.now() + 172800000).toISOString();

      // Day Scholar tries to spoof studentType as HOSTELER
      const res = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${dayScholarToken}`)
        .send({
          startDate: start,
          endDate: end,
          destination: 'Home',
          emergencyContact: '+919876543221',
          reason: 'Weekend visit to home town',
          studentType: 'HOSTELER', // Attempted override
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Day Scholar students without valid temporary hostel residential authorization');
    });

    it('Temporarily authorized Day Scholar (with active BedAllocation) CAN submit gate-pass request (201)', async () => {
      // Temporarily authorize Day Scholar by assigning a bed in Room 102
      const room102 = await prisma.room.findFirst({
        where: { roomNumber: '102' },
        include: { beds: true },
      });

      if (!room102 || room102.beds.length === 0) {
        throw new Error('Room 102 or beds not found in seeded database');
      }

      const tempBed = room102.beds[0];

      const tempAllocation = await prisma.bedAllocation.create({
        data: {
          studentProfileId: dayScholarStudentProfileId,
          bedId: tempBed.id,
          roomId: room102.id,
          bedLabel: tempBed.bedLabel,
          isActive: true,
          allocatedByAdminId: wardenUserId,
        },
      });

      const start = new Date(Date.now() + 86400000).toISOString();
      const end = new Date(Date.now() + 172800000).toISOString();

      try {
        const res = await request(app)
          .post('/api/v1/leave-requests')
          .set('Authorization', `Bearer ${dayScholarToken}`)
          .send({
            startDate: start,
            endDate: end,
            destination: 'Parent Home for Project',
            emergencyContact: '+919876543221',
            reason: 'Academic project work at home',
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.destination).toBe('Parent Home for Project');
        createdLeaveIds.push(res.body.data.id);
      } finally {
        // Clean up temporary allocation
        await prisma.bedAllocation.delete({ where: { id: tempAllocation.id } });
      }
    });
  });

  // ----------------------------------------------------
  // 2. GATE PASS / LEAVE LIFECYCLE & RULES
  // ----------------------------------------------------
  describe('2. Gate Pass / Leave Request Lifecycle', () => {
    let activeLeaveId: string;
    let cancellableLeaveId: string;

    it('Eligible Hosteler student can create a valid gate-pass request (201)', async () => {
      const start = new Date(Date.now() + 86400000).toISOString();
      const end = new Date(Date.now() + 259200000).toISOString();

      const res = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          startDate: start,
          endDate: end,
          destination: 'Bangalore Family Home',
          emergencyContact: '+919876543211',
          reason: 'Attending family wedding ceremony',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.destination).toBe('Bangalore Family Home');
      activeLeaveId = res.body.data.id;
      createdLeaveIds.push(activeLeaveId);
    });

    it('Student can view their own submitted leave requests (200)', async () => {
      const res = await request(app)
        .get('/api/v1/leave-requests/my-requests')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((l: any) => l.id === activeLeaveId);
      expect(found).toBeDefined();
      expect(found.destination).toBe('Bangalore Family Home');
    });

    it('Student can view single leave request details (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/leave-requests/${activeLeaveId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(activeLeaveId);
      expect(res.body.data.destination).toBe('Bangalore Family Home');
    });

    it('Another student CANNOT view a private leave request (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/leave-requests/${activeLeaveId}`)
        .set('Authorization', `Bearer ${dayScholarToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('Invalid date range (endDate <= startDate) is rejected with 400 Bad Request', async () => {
      const start = new Date(Date.now() + 172800000).toISOString();
      const end = new Date(Date.now() + 86400000).toISOString(); // end is before start

      const res = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          startDate: start,
          endDate: end,
          destination: 'Invalid Trip',
          emergencyContact: '+919876543211',
          reason: 'Testing date range validation',
        });

      expect(res.status).toBe(422); // Zod validation failure
      expect(res.body.success).toBe(false);
    });

    it('Student CANNOT approve or reject gate-pass requests (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leave-requests/${activeLeaveId}/review`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          status: 'APPROVED',
          remarks: 'Self approval attempt',
        });

      expect(res.status).toBe(403);
    });

    it('Mess Incharge CANNOT review gate-pass requests (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leave-requests/${activeLeaveId}/review`)
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.status).toBe(403);
    });

    it('Student can cancel their own PENDING request (200)', async () => {
      // Create a new request specifically to cancel
      const start = new Date(Date.now() + 345600000).toISOString();
      const end = new Date(Date.now() + 432000000).toISOString();

      const createRes = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          startDate: start,
          endDate: end,
          destination: 'Weekend Trekking',
          emergencyContact: '+919876543211',
          reason: 'Trekking event with friends',
        });

      cancellableLeaveId = createRes.body.data.id;
      createdLeaveIds.push(cancellableLeaveId);

      const cancelRes = await request(app)
        .post(`/api/v1/leave-requests/${cancellableLeaveId}/cancel`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');

      // Verify in DB
      const inDb = await prisma.leaveRequest.findUnique({ where: { id: cancellableLeaveId } });
      expect(inDb?.status).toBe('CANCELLED');
    });

    it('Student cannot cancel an already CANCELLED request (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/leave-requests/${cancellableLeaveId}/cancel`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Only PENDING leave requests can be cancelled');
    });

    it('Warden can view all leave requests (200)', async () => {
      const res = await request(app)
        .get('/api/v1/leave-requests?status=PENDING')
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((l: any) => l.id === activeLeaveId);
      expect(found).toBeDefined();
    });

    it('Warden can approve a pending gate-pass request (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leave-requests/${activeLeaveId}/review`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          status: 'APPROVED',
          remarks: 'Approved. Ensure to return by 9 PM on Sunday.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.reviewedByAdminId).toBe(wardenUserId);
      expect(res.body.data.remarks).toContain('Approved. Ensure to return');

      // Verify notification created for student
      const notification = await prisma.notification.findFirst({
        where: {
          userId: hostelerUserId,
          type: NotificationType.LEAVE,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(notification).toBeDefined();
      expect(notification?.title).toContain('Approved');

      // Verify AuditLog created
      const audit = await prisma.auditLog.findFirst({
        where: {
          entityId: activeLeaveId,
          action: 'LEAVE_REQUEST_APPROVED',
        },
      });
      expect(audit).toBeDefined();
    });

    it('Warden CANNOT re-review an already APPROVED request (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/leave-requests/${activeLeaveId}/review`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          status: 'REJECTED',
          remarks: 'Trying to reject after approval',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot review this request');
    });

    it('Student CANNOT cancel an already APPROVED request (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/leave-requests/${activeLeaveId}/cancel`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Only PENDING leave requests can be cancelled');
    });
  });

  // ----------------------------------------------------
  // 3. GUEST REQUEST & GUEST PASS WORKFLOW
  // ----------------------------------------------------
  describe('3. Guest Request & Guest Pass Workflow', () => {
    let createdGuestRequestId: string;
    let rejectedGuestRequestId: string;
    let generatedPassCode: string;

    it('Student can submit a valid guest request (201)', async () => {
      const visitDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

      const res = await request(app)
        .post('/api/v1/guest-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          guestName: 'Rajesh Sharma',
          relationship: 'Father',
          visitDate,
          requestedMeal: 'LUNCH',
          numberOfGuests: 2,
          reason: 'Visiting campus for academic discussion',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.guestName).toBe('Rajesh Sharma');
      expect(res.body.data.status).toBe('PENDING');
      createdGuestRequestId = res.body.data.id;
      createdGuestRequestIds.push(createdGuestRequestId);
    });

    it('Student can view their own guest requests (200)', async () => {
      const res = await request(app)
        .get('/api/v1/guest-requests/my-requests')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((g: any) => g.id === createdGuestRequestId);
      expect(found).toBeDefined();
    });

    it('Another student CANNOT view a private guest request (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/guest-requests/${createdGuestRequestId}`)
        .set('Authorization', `Bearer ${dayScholarToken}`);

      expect(res.status).toBe(403);
    });

    it('Student cannot approve guest request (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/guest-requests/${createdGuestRequestId}/review`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
    });

    it('Mess Incharge cannot review guest requests (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/guest-requests/${createdGuestRequestId}/review`)
        .set('Authorization', `Bearer ${messToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
    });

    it('Warden can view all guest requests (200)', async () => {
      const res = await request(app)
        .get('/api/v1/guest-requests?status=PENDING')
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((g: any) => g.id === createdGuestRequestId);
      expect(found).toBeDefined();
    });

    it('Warden approves guest request: atomically generates GuestPass with secure pass code (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/guest-requests/${createdGuestRequestId}/review`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          status: 'APPROVED',
          remarks: 'Visitor entry granted for campus dining area.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.request.status).toBe('APPROVED');
      expect(res.body.data.pass).toBeDefined();
      expect(res.body.data.pass.passCode).toMatch(/^GP-\d{8}-[0-9A-F]{4}$/);
      generatedPassCode = res.body.data.pass.passCode;

      // Verify GuestPass in DB
      const passInDb = await prisma.guestPass.findUnique({
        where: { guestRequestId: createdGuestRequestId },
      });
      expect(passInDb).toBeDefined();
      expect(passInDb?.passCode).toBe(generatedPassCode);
      expect(passInDb?.isVerifiedAtGate).toBe(false);

      // Verify student notification
      const notif = await prisma.notification.findFirst({
        where: {
          userId: hostelerUserId,
          type: NotificationType.GUEST,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(notif).toBeDefined();
      expect(notif?.message).toContain(generatedPassCode);
    });

    it('Student can view their generated GuestPass (200)', async () => {
      const res = await request(app)
        .get('/api/v1/guest-passes/my-passes')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const pass = res.body.data.find((p: any) => p.passCode === generatedPassCode);
      expect(pass).toBeDefined();
      expect(pass.guestRequest.guestName).toBe('Rajesh Sharma');
    });

    it('Query guest passes with isVerified=false correctly parses to boolean false and returns unverified passes (200)', async () => {
      const res = await request(app)
        .get('/api/v1/guest-passes/my-passes?isVerified=false')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const pass = res.body.data.find((p: any) => p.passCode === generatedPassCode);
      expect(pass).toBeDefined();
      expect(pass.isVerifiedAtGate).toBe(false);
    });

    it('Query guest passes with isVerified=true correctly parses to boolean true and filters out unverified passes (200)', async () => {
      const res = await request(app)
        .get('/api/v1/guest-passes/my-passes?isVerified=true')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const pass = res.body.data.find((p: any) => p.passCode === generatedPassCode);
      // The newly created pass has isVerifiedAtGate = false, so it must not be present
      expect(pass).toBeUndefined();
      res.body.data.forEach((p: any) => {
        expect(p.isVerifiedAtGate).toBe(true);
      });
    });

    it('Query guest passes with invalid isVerified value (isVerified=abc) is rejected with 422 validation error', async () => {
      const res = await request(app)
        .get('/api/v1/guest-passes/my-passes?isVerified=abc')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.error).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'isVerified',
          }),
        ])
      );
    });

    it('Another student CANNOT view this GuestPass (403)', async () => {
      const passInDb = await prisma.guestPass.findUnique({
        where: { guestRequestId: createdGuestRequestId },
      });

      const res = await request(app)
        .get(`/api/v1/guest-passes/${passInDb?.id}`)
        .set('Authorization', `Bearer ${dayScholarToken}`);

      expect(res.status).toBe(403);
    });

    it('Rejected guest request does NOT receive a GuestPass', async () => {
      const visitDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

      const createRes = await request(app)
        .post('/api/v1/guest-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          guestName: 'Unverified Visitor',
          relationship: 'Acquaintance',
          visitDate,
          reason: 'Casual meeting',
        });

      rejectedGuestRequestId = createRes.body.data.id;
      createdGuestRequestIds.push(rejectedGuestRequestId);

      const reviewRes = await request(app)
        .patch(`/api/v1/guest-requests/${rejectedGuestRequestId}/review`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          status: 'REJECTED',
          remarks: 'Visitor not on approved guardian list.',
        });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.request.status).toBe('REJECTED');
      expect(reviewRes.body.data.pass).toBeNull();

      // Verify no pass in database
      const passInDb = await prisma.guestPass.findUnique({
        where: { guestRequestId: rejectedGuestRequestId },
      });
      expect(passInDb).toBeNull();
    });

    it('Verify pass code generator entropy and format', () => {
      const testDate = new Date('2026-09-06');
      const code1 = generateSecurePassCode(testDate);
      const code2 = generateSecurePassCode(testDate);

      expect(code1).toMatch(/^GP-20260906-[0-9A-F]{4}$/);
      expect(code2).toMatch(/^GP-20260906-[0-9A-F]{4}$/);
      expect(code1).not.toBe(code2); // Cryptographically distinct
    });
  });

  // ----------------------------------------------------
  // 4. AUTHENTICATION PROTECTION
  // ----------------------------------------------------
  describe('4. Authentication Guards', () => {
    it('Unauthenticated requests to leave endpoints return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/leave-requests/my-requests');
      expect(res.status).toBe(401);
    });

    it('Unauthenticated requests to guest endpoints return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/guest-requests/my-requests');
      expect(res.status).toBe(401);
    });

    it('Unauthenticated requests to guest-pass endpoints return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/guest-passes/my-passes');
      expect(res.status).toBe(401);
    });
  });
});
