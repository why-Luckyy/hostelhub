import request from 'supertest';
import app from '../src/index';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db';
import { env } from '../src/config/env';
import { generateAccessToken, generateRefreshToken } from '../src/services/authService';
import { ROLES, STUDENT_TYPES } from '../src/constants/roles';
import { verifyToken } from '../src/middlewares/authMiddleware';
import { requireRole } from '../src/middlewares/rbacMiddleware';

describe('Authentication, Database & RBAC End-to-End Suite', () => {
  jest.setTimeout(30000);

  const testHostelerEmail = `hosteler.test.${Date.now()}@hostelhub.edu`;
  const testDayScholarEmail = `dayscholar.test.${Date.now()}@hostelhub.edu`;
  const testInactiveEmail = `inactive.user.test.${Date.now()}@hostelhub.edu`;
  const testRollHosteler = `ROLL_H_${Date.now()}`;
  const testRollDayScholar = `ROLL_DS_${Date.now()}`;

  beforeAll(async () => {
    // Clean up any lingering disposable test accounts before running
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [testHostelerEmail, testDayScholarEmail, testInactiveEmail, 'inactive.user.test@hostelhub.edu'],
          },
        },
      });
    } catch (e) {
      // Ignore initial cleanup errors
    }
  });

  afterAll(async () => {
    // Clean up dynamic test accounts created during test execution
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [testHostelerEmail, testDayScholarEmail, testInactiveEmail, 'inactive.user.test@hostelhub.edu'],
          },
        },
      });
    } catch (e) {
      // Ignore cleanup errors
    }
    await prisma.$disconnect();
  });

  // 1. System Health
  describe('System Health Endpoint', () => {
    it('GET /api/v1/health should return 200 OK and ONLINE status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ONLINE');
      expect(res.body.data.service).toBe('HostelHub API');
    });
  });

  // 2. Real Database Registration
  describe('Real Database Student Registration', () => {
    it('should register a real Hosteler student and store password as bcrypt hash', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: testHostelerEmail,
        password: 'Password@123',
        rollNumber: testRollHosteler,
        firstName: 'Anil',
        lastName: 'Kumar',
        phone: '9876543210',
        studentType: STUDENT_TYPES.HOSTELER,
        department: 'Computer Science',
        yearOfStudy: 2,
        guardianName: 'Ramesh Kumar',
        guardianPhone: '9876543211',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testHostelerEmail);
      expect(res.body.data.user.role).toBe(ROLES.STUDENT);
      expect(res.body.data.profile.studentType).toBe(STUDENT_TYPES.HOSTELER);

      // Verify DB record directly
      const dbUser = await prisma.user.findUnique({
        where: { email: testHostelerEmail },
        include: { studentProfile: true },
      });

      expect(dbUser).not.toBeNull();
      expect(dbUser!.passwordHash.startsWith('$2')).toBe(true); // bcrypt prefix
      expect(dbUser!.passwordHash).not.toBe('Password@123'); // never plaintext
      expect(dbUser!.studentProfile).not.toBeNull();
      expect(dbUser!.studentProfile!.rollNumber).toBe(testRollHosteler);
    });

    it('should register a real Day Scholar student', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: testDayScholarEmail,
        password: 'Password@123',
        rollNumber: testRollDayScholar,
        firstName: 'Sneha',
        lastName: 'Patel',
        phone: '9876543220',
        studentType: STUDENT_TYPES.DAY_SCHOLAR,
        department: 'Information Technology',
        yearOfStudy: 1,
        guardianName: 'Dinesh Patel',
        guardianPhone: '9876543221',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.studentType).toBe(STUDENT_TYPES.DAY_SCHOLAR);
    });

    it('should reject duplicate email with 409 Conflict', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: testHostelerEmail, // already registered
        password: 'Password@123',
        rollNumber: `UNIQUE_${Date.now()}`,
        firstName: 'Duplicate',
        lastName: 'User',
        phone: '9876543230',
        studentType: STUDENT_TYPES.HOSTELER,
        department: 'CS',
        yearOfStudy: 1,
        guardianName: 'Guardian',
        guardianPhone: '9876543231',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('email address already exists');
    });

    it('should reject duplicate roll number with 409 Conflict', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: `new.email.${Date.now()}@hostelhub.edu`,
        password: 'Password@123',
        rollNumber: testRollHosteler, // already registered
        firstName: 'Duplicate',
        lastName: 'Roll',
        phone: '9876543240',
        studentType: STUDENT_TYPES.HOSTELER,
        department: 'CS',
        yearOfStudy: 1,
        guardianName: 'Guardian',
        guardianPhone: '9876543241',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('roll number is already registered');
    });

    it('should prevent registration from assigning WARDEN or MESS_INCHARGE roles', async () => {
      const targetEmail = `hacker.${Date.now()}@hostelhub.edu`;
      const res = await request(app).post('/api/v1/auth/register').send({
        email: targetEmail,
        password: 'Password@123',
        role: ROLES.WARDEN, // Attempt privilege escalation
        rollNumber: `ROLL_HACK_${Date.now()}`,
        firstName: 'Malicious',
        lastName: 'Actor',
        phone: '9876543250',
        studentType: STUDENT_TYPES.HOSTELER,
        department: 'CS',
        yearOfStudy: 1,
        guardianName: 'Parent',
        guardianPhone: '9876543251',
      });

      // Must succeed as STUDENT, but ignore the role parameter completely
      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe(ROLES.STUDENT);

      const dbUser = await prisma.user.findUnique({ where: { email: targetEmail } });
      expect(dbUser?.role).toBe(ROLES.STUDENT);

      // Clean up
      await prisma.user.delete({ where: { email: targetEmail } });
    });
  });

  // 3. Real Database Login
  describe('Real Database Login Across Roles', () => {
    it('should authenticate seeded Student (hosteler@hostelhub.edu)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'hosteler@hostelhub.edu',
        password: 'Student@123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(ROLES.STUDENT);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined(); // never expose hash
    });

    it('should authenticate seeded Warden (warden@hostelhub.edu)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'warden@hostelhub.edu',
        password: 'Warden@123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(ROLES.WARDEN);
    });

    it('should authenticate seeded Mess Incharge (mess@hostelhub.edu)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'mess@hostelhub.edu',
        password: 'Mess@123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(ROLES.MESS_INCHARGE);
    });

    it('should reject invalid password with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'warden@hostelhub.edu',
        password: 'WrongPassword@999',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject disabled/inactive users with 403 Forbidden', async () => {
      // Create temporary disabled user
      const disabledPasswordHash = await bcrypt.hash('Disabled@123', 10);
      await prisma.user.deleteMany({
        where: {
          email: { in: [testInactiveEmail, 'inactive.user.test@hostelhub.edu'] },
        },
      });
      const disabledUser = await prisma.user.create({
        data: {
          email: testInactiveEmail,
          passwordHash: disabledPasswordHash,
          role: ROLES.STUDENT,
          isActive: false, // Disabled
        },
      });

      try {
        const res = await request(app).post('/api/v1/auth/login').send({
          email: testInactiveEmail,
          password: 'Disabled@123',
        });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Account is disabled');
      } finally {
        await prisma.user.deleteMany({
          where: {
            email: { in: [testInactiveEmail, 'inactive.user.test@hostelhub.edu'] },
          },
        });
      }
    });
  });

  // 4. Token Storage, Refresh & Rotation
  describe('Token Generation, Rotation & Session Invalidation', () => {
    let activeRefreshToken: string;
    let studentAccessToken: string;

    beforeAll(async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'dayscholar@hostelhub.edu',
        password: 'Student@123',
      });
      activeRefreshToken = loginRes.body.data.refreshToken;
      studentAccessToken = loginRes.body.data.accessToken;
    });

    it('should verify refresh token is stored hashed in database', async () => {
      const user = await prisma.user.findUnique({
        where: { email: 'dayscholar@hostelhub.edu' },
      });

      expect(user?.refreshToken).not.toBeNull();
      expect(user?.refreshToken?.startsWith('$2')).toBe(true); // bcrypt hash
      expect(user?.refreshToken).not.toBe(activeRefreshToken); // not plaintext
    });

    it('should exchange refresh token for new access token and rotated refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: activeRefreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(activeRefreshToken); // rotated!

      // Update for subsequent test
      const oldToken = activeRefreshToken;
      activeRefreshToken = res.body.data.refreshToken;

      // Old refresh token must be rejected
      const retryOldRes = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: oldToken,
      });
      expect(retryOldRes.status).toBe(401);
    });

    it('should reject invalid or garbage refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'invalid_malformed_token_string',
      });
      expect(res.status).toBe(401);
    });
  });

  // 5. Lightweight /auth/me Profile Verification
  describe('GET /api/v1/auth/me Profile Endpoint', () => {
    it('should return correct user identity, role, and studentType without exposing password', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'hosteler@hostelhub.edu',
        password: 'Student@123',
      });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('hosteler@hostelhub.edu');
      expect(res.body.data.role).toBe(ROLES.STUDENT);
      expect(res.body.data.studentProfile).toBeDefined();
      expect(res.body.data.studentProfile.studentType).toBe(STUDENT_TYPES.HOSTELER);
      expect(res.body.data.passwordHash).toBeUndefined(); // Security check
      expect(res.body.data.refreshToken).toBeUndefined(); // Security check
    });
  });

  // 6. Logout & Invalidation
  describe('POST /api/v1/auth/logout Session Revocation', () => {
    it('should invalidate refresh session in database upon logout', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testHostelerEmail,
        password: 'Password@123',
      });

      const { accessToken, refreshToken } = loginRes.body.data;

      // Verify token in DB before logout
      const beforeUser = await prisma.user.findUnique({ where: { email: testHostelerEmail } });
      expect(beforeUser?.refreshToken).not.toBeNull();

      // Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toContain('Logged out successfully');

      // Verify DB refreshToken is null
      const afterUser = await prisma.user.findUnique({ where: { email: testHostelerEmail } });
      expect(afterUser?.refreshToken).toBeNull();

      // Attempting to refresh with old token must now fail
      const refreshAttempt = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });
      expect(refreshAttempt.status).toBe(401);
    });
  });

  // 7. Role-Based Access Control (RBAC) Verification
  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    let studentToken: string;
    let wardenToken: string;
    let messToken: string;

    beforeAll(async () => {
      const studentLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'hosteler@hostelhub.edu',
        password: 'Student@123',
      });
      studentToken = studentLogin.body.data.accessToken;

      const wardenLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'warden@hostelhub.edu',
        password: 'Warden@123',
      });
      wardenToken = wardenLogin.body.data.accessToken;

      const messLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'mess@hostelhub.edu',
        password: 'Mess@123',
      });
      messToken = messLogin.body.data.accessToken;
    });

    it('Student -> Student Endpoint: ALLOWED (200)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test/student-role')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Student -> Warden Endpoint: FORBIDDEN (403)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test/warden-role')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Student -> Mess Endpoint: FORBIDDEN (403)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test/mess-role')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Warden -> Warden Endpoint: ALLOWED (200)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test/warden-role')
        .set('Authorization', `Bearer ${wardenToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Mess Incharge -> Mess Endpoint: ALLOWED (200)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test/mess-role')
        .set('Authorization', `Bearer ${messToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Mess Incharge -> Warden Endpoint: FORBIDDEN (403)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test/warden-role')
        .set('Authorization', `Bearer ${messToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Unauthenticated Request -> Protected Endpoint: UNAUTHORIZED (401)', async () => {
      const res = await request(app).get('/api/v1/auth/test/warden-role');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
