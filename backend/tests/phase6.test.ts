import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import { generateAccessToken } from '../src/services/authService';
import { ROLES, STUDENT_TYPES } from '../src/constants/roles';
import { ComplaintCategory, ComplaintPriority, NoticeCategory, AudienceType, FineStatus } from '@prisma/client';

describe('Phase 6: Complaints, Notices & Fines End-to-End Suite', () => {
  jest.setTimeout(60000);

  let wardenToken: string;
  let messToken: string;
  let hostelerToken: string;
  let dayScholarToken: string;

  let wardenUserId: string;
  let messUserId: string;
  let hostelerStudentProfileId: string;
  let dayScholarStudentProfileId: string;
  let hostelerUserId: string;
  let dayScholarUserId: string;

  // Cleanup tracking arrays
  const createdComplaintIds: string[] = [];
  const createdNoticeIds: string[] = [];
  const createdFineIds: string[] = [];
  const createdNotificationIds: string[] = [];
  const createdAuditLogIds: string[] = [];

  beforeAll(async () => {
    // Fetch seeded test accounts
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
      throw new Error('Required seeded accounts not found. Please ensure database is seeded.');
    }

    wardenUserId = warden.id;
    messUserId = mess.id;
    hostelerStudentProfileId = hosteler.studentProfile.id;
    dayScholarStudentProfileId = dayScholar.studentProfile.id;
    hostelerUserId = hosteler.id;
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

    hostelerToken = generateAccessToken({
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
      if (createdFineIds.length > 0) {
        await prisma.fine.deleteMany({
          where: { id: { in: createdFineIds } },
        });
      }
      if (createdComplaintIds.length > 0) {
        await prisma.complaint.deleteMany({
          where: { id: { in: createdComplaintIds } },
        });
      }
      if (createdNoticeIds.length > 0) {
        await prisma.notice.deleteMany({
          where: { id: { in: createdNoticeIds } },
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
  // 1. COMPLAINTS SUITE
  // =========================================================================
  describe('1. Complaints Module', () => {
    let testComplaintId: string;
    let dayScholarComplaintId: string;

    it('1.1 should allow a student to submit a complaint (DB SUBMITTED, API PENDING)', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          title: 'Room 204 Fan Making Loud Noise',
          description: 'The ceiling fan speed regulator is sparking and oscillating loudly.',
          category: 'ELECTRICAL',
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('PENDING'); // API maps SUBMITTED to PENDING
      expect(res.body.data.category).toBe('ELECTRICAL');
      expect(res.body.data.priority).toBe('HIGH');

      testComplaintId = res.body.data.id;
      createdComplaintIds.push(testComplaintId);

      // Verify direct database persistence is SUBMITTED
      const dbComplaint = await prisma.complaint.findUnique({
        where: { id: testComplaintId },
      });
      expect(dbComplaint).not.toBeNull();
      expect(dbComplaint?.status).toBe('SUBMITTED');
    });

    it('1.2 should validate required fields when creating a complaint', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          title: 'AB', // too short (< 3)
          description: '',
          category: 'INVALID_CATEGORY',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('1.3 should allow student to retrieve their own complaints', async () => {
      const res = await request(app)
        .get('/api/v1/complaints/my-complaints')
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((c: any) => c.id === testComplaintId);
      expect(found).toBeDefined();
      expect(found.status).toBe('PENDING');
    });

    it('1.4 should filter student complaints by status query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/complaints/my-complaints?status=PENDING')
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((c: any) => c.status === 'PENDING')).toBe(true);
    });

    it('1.5 should enforce strict privacy between students (Student A cannot see Student B complaints)', async () => {
      // Day Scholar creates a complaint
      const dsRes = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${dayScholarToken}`)
        .send({
          title: 'Locker Key Broken',
          description: 'Day scholar locker key broke inside locker 45.',
          category: 'OTHER',
          priority: 'LOW',
        });

      expect(dsRes.status).toBe(201);
      dayScholarComplaintId = dsRes.body.data.id;
      createdComplaintIds.push(dayScholarComplaintId);

      // Hosteler views their own complaints - must NOT see day scholar's complaint
      const hostelerList = await request(app)
        .get('/api/v1/complaints/my-complaints')
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(hostelerList.status).toBe(200);
      const leaked = hostelerList.body.data.find((c: any) => c.id === dayScholarComplaintId);
      expect(leaked).toBeUndefined();

      // Hosteler tries to fetch Day Scholar complaint by ID directly - must get 403 FORBIDDEN
      const directAccess = await request(app)
        .get(`/api/v1/complaints/my-complaints/${dayScholarComplaintId}`)
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(directAccess.status).toBe(403);
    });

    it('1.6 should forbid students from solving complaints', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${testComplaintId}/resolve`)
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({ resolutionNotes: 'Trying to self resolve' });

      expect(res.status).toBe(403);
    });

    it('1.7 should allow Warden to view all complaints across all students', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const hasHosteler = res.body.data.find((c: any) => c.id === testComplaintId);
      const hasDayScholar = res.body.data.find((c: any) => c.id === dayScholarComplaintId);

      expect(hasHosteler).toBeDefined();
      expect(hasDayScholar).toBeDefined();
    });

    it('1.8 should allow Warden to view specific complaint details with student profile', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${testComplaintId}`)
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testComplaintId);
      expect(res.body.data.studentProfile).toBeDefined();
      expect(res.body.data.studentProfile.rollNumber).toBeDefined();
    });

    it('1.9 should allow Warden to resolve complaint with optional notes (DB RESOLVED, API SOLVED)', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${testComplaintId}/resolve`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          resolutionNotes: 'Electrician replaced the fan regulator and checked wiring.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SOLVED');
      expect(res.body.data.resolutionNotes).toContain('Electrician replaced');
      expect(res.body.data.resolvedAt).toBeDefined();

      // Verify direct database persistence
      const dbComplaint = await prisma.complaint.findUnique({
        where: { id: testComplaintId },
      });
      expect(dbComplaint?.status).toBe('RESOLVED');
      expect(dbComplaint?.resolvedAt).not.toBeNull();

      // Verify in-app Notification generated for student
      const notification = await prisma.notification.findFirst({
        where: {
          userId: hostelerUserId,
          type: 'COMPLAINT',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(notification).not.toBeNull();
      expect(notification?.title).toContain('Complaint Solved');
      if (notification) createdNotificationIds.push(notification.id);

      // Verify AuditLog generated for Warden action
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityId: testComplaintId,
          action: 'COMPLAINT_RESOLVED',
        },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.userId).toBe(wardenUserId);
      if (auditLog) createdAuditLogIds.push(auditLog.id);
    });

    it('1.10 should reject resolving an already solved complaint and disallow reopen (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${testComplaintId}/resolve`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ resolutionNotes: 'Attempting to resolve again' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already solved');
    });

    it('1.11 should return 403 Forbidden to Mess Incharge on complaint endpoints', async () => {
      const listRes = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${messToken}`);
      expect(listRes.status).toBe(403);

      const createRes = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${messToken}`)
        .send({ title: 'Test', description: 'Test desc', category: 'MESS' });
      expect(createRes.status).toBe(403);

      const resolveRes = await request(app)
        .patch(`/api/v1/complaints/${dayScholarComplaintId}/resolve`)
        .set('Authorization', `Bearer ${messToken}`)
        .send({ resolutionNotes: 'Not allowed' });
      expect(resolveRes.status).toBe(403);
    });
  });

  // =========================================================================
  // 2. NOTICES SUITE
  // =========================================================================
  describe('2. Notices Module', () => {
    let testNoticeId: string;
    let pinnedNoticeId: string;

    it('2.1 should allow Warden to publish a new notice', async () => {
      const res = await request(app)
        .post('/api/v1/notices')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          title: 'Campus Wi-Fi Maintenance Schedule',
          content: 'The campus IT network will undergo routine maintenance from 02:00 AM to 05:00 AM on Sunday.',
          category: 'GENERAL',
          targetAudience: 'ALL',
          isPinned: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Campus Wi-Fi Maintenance Schedule');
      expect(res.body.data.category).toBe('GENERAL');
      expect(res.body.data.targetAudience).toBe('ALL');
      expect(res.body.data.isPinned).toBe(false);

      testNoticeId = res.body.data.id;
      createdNoticeIds.push(testNoticeId);

      // Verify AuditLog
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityId: testNoticeId,
          action: 'NOTICE_CREATED',
        },
      });
      expect(auditLog).not.toBeNull();
      if (auditLog) createdAuditLogIds.push(auditLog.id);
    });

    it('2.2 should allow Warden to create a pinned urgent notice', async () => {
      const res = await request(app)
        .post('/api/v1/notices')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          title: 'Urgent: Water Supply Shutdown',
          content: 'Due to main pipeline maintenance, water supply will be halted tomorrow morning.',
          category: 'URGENT',
          targetAudience: 'HOSTELERS',
          isPinned: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isPinned).toBe(true);
      expect(res.body.data.category).toBe('URGENT');

      pinnedNoticeId = res.body.data.id;
      createdNoticeIds.push(pinnedNoticeId);
    });

    it('2.3 should allow Student to view notices with audience filtering applied', async () => {
      // Hosteler should see ALL and HOSTELERS
      const hostelerRes = await request(app)
        .get('/api/v1/notices')
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(hostelerRes.status).toBe(200);
      expect(Array.isArray(hostelerRes.body.data)).toBe(true);
      const hostelerNoticeIds = hostelerRes.body.data.map((n: any) => n.id);
      expect(hostelerNoticeIds).toContain(testNoticeId);
      expect(hostelerNoticeIds).toContain(pinnedNoticeId);

      // Day Scholar should see ALL, but NOT HOSTELERS
      const dayScholarRes = await request(app)
        .get('/api/v1/notices')
        .set('Authorization', `Bearer ${dayScholarToken}`);

      expect(dayScholarRes.status).toBe(200);
      const dayScholarNoticeIds = dayScholarRes.body.data.map((n: any) => n.id);
      expect(dayScholarNoticeIds).toContain(testNoticeId);
      expect(dayScholarNoticeIds).not.toContain(pinnedNoticeId);
    });

    it('2.4 should allow Warden and Students to view notice by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/notices/${testNoticeId}`)
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testNoticeId);
      expect(res.body.data.publishedBy).toBeDefined();
    });

    it('2.5 should allow Warden to update a notice', async () => {
      const res = await request(app)
        .put(`/api/v1/notices/${testNoticeId}`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          title: 'Campus Wi-Fi Maintenance Schedule - UPDATED',
          content: 'Updated window: Maintenance will be from 03:00 AM to 04:30 AM.',
          isPinned: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toContain('UPDATED');
      expect(res.body.data.isPinned).toBe(true);

      // Verify AuditLog
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityId: testNoticeId,
          action: 'NOTICE_UPDATED',
        },
      });
      expect(auditLog).not.toBeNull();
      if (auditLog) createdAuditLogIds.push(auditLog.id);
    });

    it('2.6 should forbid students from creating, updating, or deleting notices (403)', async () => {
      const createRes = await request(app)
        .post('/api/v1/notices')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({ title: 'Student Notice', content: 'Testing permissions' });
      expect(createRes.status).toBe(403);

      const updateRes = await request(app)
        .put(`/api/v1/notices/${testNoticeId}`)
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({ title: 'Hacked' });
      expect(updateRes.status).toBe(403);

      const deleteRes = await request(app)
        .delete(`/api/v1/notices/${testNoticeId}`)
        .set('Authorization', `Bearer ${hostelerToken}`);
      expect(deleteRes.status).toBe(403);
    });

    it('2.7 should forbid Mess Incharge from managing notices (403)', async () => {
      const createRes = await request(app)
        .post('/api/v1/notices')
        .set('Authorization', `Bearer ${messToken}`)
        .send({ title: 'Mess Notice', content: 'Testing mess permissions' });
      expect(createRes.status).toBe(403);

      const deleteRes = await request(app)
        .delete(`/api/v1/notices/${testNoticeId}`)
        .set('Authorization', `Bearer ${messToken}`);
      expect(deleteRes.status).toBe(403);
    });

    it('2.8 should allow Warden to delete a notice', async () => {
      const res = await request(app)
        .delete(`/api/v1/notices/${pinnedNoticeId}`)
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion in database
      const deleted = await prisma.notice.findUnique({
        where: { id: pinnedNoticeId },
      });
      expect(deleted).toBeNull();

      // Remove from cleanup array
      const idx = createdNoticeIds.indexOf(pinnedNoticeId);
      if (idx !== -1) createdNoticeIds.splice(idx, 1);
    });
  });

  // =========================================================================
  // 3. FINES SUITE
  // =========================================================================
  describe('3. Fines Module', () => {
    let testFineId: string;
    let dayScholarFineId: string;

    it('3.1 should allow Warden to assign a disciplinary fine to a student (status UNPAID)', async () => {
      const res = await request(app)
        .post('/api/v1/fines')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: hostelerStudentProfileId,
          amount: 500,
          reason: 'Late entry into hostel premises at 11:45 PM past curfew.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(Number(res.body.data.amount)).toBe(500);
      expect(res.body.data.status).toBe('UNPAID');
      expect(res.body.data.paidAt).toBeNull();
      expect(res.body.data.reason).toContain('Late entry');

      testFineId = res.body.data.id;
      createdFineIds.push(testFineId);

      // Verify in-app Notification generated for student
      const notification = await prisma.notification.findFirst({
        where: {
          userId: hostelerUserId,
          type: 'SYSTEM',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(notification).not.toBeNull();
      expect(notification?.title).toContain('Disciplinary Fine');
      if (notification) createdNotificationIds.push(notification.id);

      // Verify AuditLog
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityId: testFineId,
          action: 'FINE_ASSIGNED',
        },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.userId).toBe(wardenUserId);
      if (auditLog) createdAuditLogIds.push(auditLog.id);
    });

    it('3.2 should validate fine input (amount > 0, reason length)', async () => {
      const res = await request(app)
        .post('/api/v1/fines')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: hostelerStudentProfileId,
          amount: -50, // Invalid negative
          reason: 'A', // Too short
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('3.3 should allow student to view their own fines', async () => {
      const res = await request(app)
        .get('/api/v1/fines/my-fines')
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((f: any) => f.id === testFineId);
      expect(found).toBeDefined();
      expect(Number(found.amount)).toBe(500);
      expect(found.status).toBe('UNPAID');
    });

    it('3.4 should enforce strict privacy between students (Student A cannot see Student B fines)', async () => {
      // Warden assigns fine to Day Scholar
      const dsFineRes = await request(app)
        .post('/api/v1/fines')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          studentProfileId: dayScholarStudentProfileId,
          amount: 250,
          reason: 'Parking two-wheeler in unauthorized warden bay.',
        });

      expect(dsFineRes.status).toBe(201);
      dayScholarFineId = dsFineRes.body.data.id;
      createdFineIds.push(dayScholarFineId);

      // Hosteler views own fines - must NOT see Day Scholar's fine
      const hostelerList = await request(app)
        .get('/api/v1/fines/my-fines')
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(hostelerList.status).toBe(200);
      const leaked = hostelerList.body.data.find((f: any) => f.id === dayScholarFineId);
      expect(leaked).toBeUndefined();

      // Hosteler attempts to view Day Scholar fine by ID directly - must get 403 FORBIDDEN
      const directView = await request(app)
        .get(`/api/v1/fines/my-fines/${dayScholarFineId}`)
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(directView.status).toBe(403);
    });

    it('3.5 should allow Warden to view all fines across all students', async () => {
      const res = await request(app)
        .get('/api/v1/fines')
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const hasHostelerFine = res.body.data.find((f: any) => f.id === testFineId);
      const hasDsFine = res.body.data.find((f: any) => f.id === dayScholarFineId);

      expect(hasHostelerFine).toBeDefined();
      expect(hasDsFine).toBeDefined();
    });

    it('3.6 should allow Warden to mark a fine status as PAID', async () => {
      const res = await request(app)
        .patch(`/api/v1/fines/${testFineId}/status`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PAID');
      expect(res.body.data.paidAt).toBeDefined();

      // Direct DB verification
      const dbFine = await prisma.fine.findUnique({
        where: { id: testFineId },
      });
      expect(dbFine?.status).toBe('PAID');
      expect(dbFine?.paidAt).not.toBeNull();

      // In-app Notification for student
      const notification = await prisma.notification.findFirst({
        where: {
          userId: hostelerUserId,
          title: 'Fine Payment Recorded',
        },
      });
      expect(notification).not.toBeNull();
      if (notification) createdNotificationIds.push(notification.id);

      // AuditLog
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityId: testFineId,
          action: 'FINE_STATUS_UPDATED',
        },
      });
      expect(auditLog).not.toBeNull();
      if (auditLog) createdAuditLogIds.push(auditLog.id);
    });

    it('3.7 should return 400 Bad Request when attempting to mark an already PAID fine as PAID', async () => {
      const res = await request(app)
        .patch(`/api/v1/fines/${testFineId}/status`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already marked as PAID');
    });

    it('3.8 should forbid students from assigning or updating fines (403)', async () => {
      const assignRes = await request(app)
        .post('/api/v1/fines')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          studentProfileId: dayScholarStudentProfileId,
          amount: 100,
          reason: 'Unauthorized student assigning fine',
        });
      expect(assignRes.status).toBe(403);

      const statusRes = await request(app)
        .patch(`/api/v1/fines/${dayScholarFineId}/status`)
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({ status: 'PAID' });
      expect(statusRes.status).toBe(403);
    });

    it('3.9 should return 403 Forbidden to Mess Incharge on fine endpoints', async () => {
      const listRes = await request(app)
        .get('/api/v1/fines')
        .set('Authorization', `Bearer ${messToken}`);
      expect(listRes.status).toBe(403);

      const assignRes = await request(app)
        .post('/api/v1/fines')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          studentProfileId: hostelerStudentProfileId,
          amount: 100,
          reason: 'Mess staff fine attempt',
        });
      expect(assignRes.status).toBe(403);

      const statusRes = await request(app)
        .patch(`/api/v1/fines/${dayScholarFineId}/status`)
        .set('Authorization', `Bearer ${messToken}`)
        .send({ status: 'PAID' });
      expect(statusRes.status).toBe(403);
    });
  });

  // =========================================================================
  // 4. SECURITY & AUTHENTICATION GUARDS
  // =========================================================================
  describe('4. Security & Unauthenticated Guards', () => {
    it('4.1 should return 401 Unauthorized for unauthenticated requests', async () => {
      const cRes = await request(app).get('/api/v1/complaints');
      expect(cRes.status).toBe(401);

      const nRes = await request(app).get('/api/v1/notices');
      expect(nRes.status).toBe(401);

      const fRes = await request(app).get('/api/v1/fines');
      expect(fRes.status).toBe(401);
    });
  });
});
