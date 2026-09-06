import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import { generateAccessToken } from '../src/services/authService';
import { ROLES, STUDENT_TYPES } from '../src/constants/roles';

describe('Phase 7: Campus Presence / GPS & Geofencing End-to-End Suite', () => {
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
  const createdGeofenceIds: string[] = [];
  const createdPresenceLogIds: string[] = [];
  const createdAuditLogIds: string[] = [];

  // University Campus Geofence Test Constants
  const CAMPUS_CENTER_LAT = 12.9716;
  const CAMPUS_CENTER_LON = 77.5946;
  const CAMPUS_RADIUS_METERS = 1000.0; // 1,000 meters

  let testGeofenceId: string;

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

    // Clean up any lingering presence logs for these test students from prior runs
    try {
      await prisma.campusPresenceLog.deleteMany({
        where: {
          studentProfileId: { in: [hostelerStudentProfileId, dayScholarStudentProfileId] },
        },
      });
    } catch (e) {
      // Ignore initial cleanup
    }
  });

  afterAll(async () => {
    try {
      if (createdPresenceLogIds.length > 0) {
        await prisma.campusPresenceLog.deleteMany({
          where: { id: { in: createdPresenceLogIds } },
        });
      }
      if (createdGeofenceIds.length > 0) {
        await prisma.campusGeofence.deleteMany({
          where: { id: { in: createdGeofenceIds } },
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
  // 1. GEOFENCE CONFIGURATION SUITE
  // =========================================================================
  describe('1. Geofence Configuration Module', () => {
    it('1.1 should allow Warden to create and activate a circular campus geofence', async () => {
      const res = await request(app)
        .post('/api/v1/presence/geofence')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          name: 'Main University Campus - East Zone',
          latitude: CAMPUS_CENTER_LAT,
          longitude: CAMPUS_CENTER_LON,
          radiusMeters: CAMPUS_RADIUS_METERS,
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Main University Campus - East Zone');
      expect(Number(res.body.data.latitude)).toBeCloseTo(CAMPUS_CENTER_LAT, 4);
      expect(Number(res.body.data.longitude)).toBeCloseTo(CAMPUS_CENTER_LON, 4);
      expect(res.body.data.radiusMeters).toBe(CAMPUS_RADIUS_METERS);
      expect(res.body.data.isActive).toBe(true);

      testGeofenceId = res.body.data.id;
      createdGeofenceIds.push(testGeofenceId);

      // Verify AuditLog was recorded
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityId: testGeofenceId,
          action: 'GEOFENCE_CREATED',
        },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.userId).toBe(wardenUserId);
      if (auditLog) createdAuditLogIds.push(auditLog.id);
    });

    it('1.2 should allow Warden to update an existing geofence', async () => {
      const res = await request(app)
        .put(`/api/v1/presence/geofence/${testGeofenceId}`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          name: 'Main University Campus - Updated Perimeter',
          radiusMeters: 1200,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Main University Campus - Updated Perimeter');
      expect(res.body.data.radiusMeters).toBe(1200);

      // Verify AuditLog was recorded
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityId: testGeofenceId,
          action: 'GEOFENCE_UPDATED',
        },
      });
      expect(auditLog).not.toBeNull();
      if (auditLog) createdAuditLogIds.push(auditLog.id);

      // Reset radius to 1000m for subsequent tests
      await request(app)
        .put(`/api/v1/presence/geofence/${testGeofenceId}`)
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ radiusMeters: CAMPUS_RADIUS_METERS });
    });

    it('1.3 should allow Student and Warden to view active geofence configuration', async () => {
      const studentRes = await request(app)
        .get('/api/v1/presence/geofence')
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(studentRes.status).toBe(200);
      expect(studentRes.body.data.id).toBeDefined();
      expect(studentRes.body.data.name).toBeDefined();
      expect(studentRes.body.data.radiusMeters).toBeDefined();

      const wardenRes = await request(app)
        .get('/api/v1/presence/geofence')
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(wardenRes.status).toBe(200);
      expect(wardenRes.body.data.id).toBe(studentRes.body.data.id);
    });

    it('1.4 should forbid Student and Mess Incharge from creating or updating geofences (403)', async () => {
      const studentCreate = await request(app)
        .post('/api/v1/presence/geofence')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({ name: 'Fake Geofence', latitude: 12.9, longitude: 77.5, radiusMeters: 500 });
      expect(studentCreate.status).toBe(403);

      const messCreate = await request(app)
        .post('/api/v1/presence/geofence')
        .set('Authorization', `Bearer ${messToken}`)
        .send({ name: 'Mess Geofence', latitude: 12.9, longitude: 77.5, radiusMeters: 500 });
      expect(messCreate.status).toBe(403);

      const studentUpdate = await request(app)
        .put(`/api/v1/presence/geofence/${testGeofenceId}`)
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({ radiusMeters: 999 });
      expect(studentUpdate.status).toBe(403);
    });
  });

  // =========================================================================
  // 2. GPS VALIDATION & BOUNDARY GUARDS
  // =========================================================================
  describe('2. GPS Validation & Input Guards', () => {
    it('2.1 should reject latitude values below -90 or above 90 (422)', async () => {
      const lowLat = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: -91.5,
          longitude: 77.5946,
          accuracyMeters: 10,
        });
      expect(lowLat.status).toBe(422);

      const highLat = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: 90.0001,
          longitude: 77.5946,
          accuracyMeters: 10,
        });
      expect(highLat.status).toBe(422);
    });

    it('2.2 should reject longitude values below -180 or above 180 (422)', async () => {
      const lowLon = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: 12.9716,
          longitude: -180.1,
          accuracyMeters: 10,
        });
      expect(lowLon.status).toBe(422);

      const highLon = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: 12.9716,
          longitude: 180.005,
          accuracyMeters: 10,
        });
      expect(highLon.status).toBe(422);
    });

    it('2.3 should reject non-positive or excessive accuracy readings (> 100 meters) (422)', async () => {
      const negativeAcc = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
          accuracyMeters: -5,
        });
      expect(negativeAcc.status).toBe(422);

      const excessiveAcc = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
          accuracyMeters: 150, // Greater than 100m threshold
        });
      expect(excessiveAcc.status).toBe(422);
      expect(excessiveAcc.body.error[0]?.message).toContain('100m threshold');
    });

    it('2.4 should reject stale client timestamps older than 5 minutes tolerance (422)', async () => {
      const staleTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 mins ago

      const res = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
          accuracyMeters: 15,
          clientTimestamp: staleTime,
        });

      expect(res.status).toBe(422);
      expect(res.body.error[0]?.message).toContain('5-minute tolerance');
    });
  });

  // =========================================================================
  // 3. SERVER-AUTHORITATIVE PRESENCE VERIFICATION (INSIDE / OUTSIDE / BOUNDARY)
  // =========================================================================
  describe('3. Server-Authoritative Haversine Presence Verification', () => {
    let insideLogId: string;
    let outsideLogId: string;

    it('3.1 should verify student presence as INSIDE when coordinates are within radius', async () => {
      // Coordinates ~110 meters away from campus center:
      // (12.9716, 77.5946) -> (12.9725, 77.5950) ≈ 108 meters < 1000m radius
      const res = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: 12.9725,
          longitude: 77.595,
          accuracyMeters: 12,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isInside).toBe(true); // Server calculates INSIDE
      expect(res.body.data.calculatedDistance).toBeGreaterThan(50);
      expect(res.body.data.calculatedDistance).toBeLessThan(200);
      expect(res.body.data.distanceFromBoundary).toBe(
        Math.round((CAMPUS_RADIUS_METERS - res.body.data.calculatedDistance) * 100) / 100
      );
      expect(res.body.data.recordedAt).toBeDefined();

      insideLogId = res.body.data.id;
      createdPresenceLogIds.push(insideLogId);

      // Verify direct database persistence
      const dbLog = await prisma.campusPresenceLog.findUnique({
        where: { id: insideLogId },
      });
      expect(dbLog).not.toBeNull();
      expect(dbLog?.isInside).toBe(true);
      expect(dbLog?.studentProfileId).toBe(hostelerStudentProfileId);
    });

    it('3.2 should verify student presence as OUTSIDE when coordinates are outside radius', async () => {
      // Coordinates ~4.5 km away from campus center:
      // (12.9716, 77.5946) -> (12.9400, 77.6200) ≈ 4.4 km > 1000m radius
      const res = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: 12.94,
          longitude: 77.62,
          accuracyMeters: 20,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isInside).toBe(false); // Server calculates OUTSIDE
      expect(res.body.data.calculatedDistance).toBeGreaterThan(3000);
      expect(res.body.data.distanceFromBoundary).toBe(
        Math.round((res.body.data.calculatedDistance - CAMPUS_RADIUS_METERS) * 100) / 100
      );

      outsideLogId = res.body.data.id;
      createdPresenceLogIds.push(outsideLogId);

      // Verify DB record
      const dbLog = await prisma.campusPresenceLog.findUnique({
        where: { id: outsideLogId },
      });
      expect(dbLog?.isInside).toBe(false);
    });

    it('3.3 should prevent client from forcing or faking isInside or calculatedDistance (Server Authority)', async () => {
      // Client maliciously sends isInside: true and calculatedDistance: 0 for coordinates that are 5 km away
      const res = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: 12.93,
          longitude: 77.65,
          accuracyMeters: 10,
          isInside: true, // Malicious override attempt
          calculatedDistance: 0, // Malicious override attempt
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isInside).toBe(false); // Backend rejects client-claimed status and computes OUTSIDE
      expect(res.body.data.calculatedDistance).toBeGreaterThan(4000);

      createdPresenceLogIds.push(res.body.data.id);
    });

    it('3.4 should support Day Scholar students verifying campus presence without restriction', async () => {
      // Day Scholar physically on campus grounds
      const res = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${dayScholarToken}`)
        .send({
          latitude: CAMPUS_CENTER_LAT,
          longitude: CAMPUS_CENTER_LON,
          accuracyMeters: 8,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isInside).toBe(true);
      expect(res.body.data.calculatedDistance).toBe(0); // At center

      createdPresenceLogIds.push(res.body.data.id);
    });

    it('3.5 should correctly handle exact boundary condition (distance <= radius is INSIDE)', async () => {
      // Radius is 1000m. If distance is <= 1000, isInside is true.
      // At center: distance is 0 <= 1000 -> INSIDE
      const centerRes = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${hostelerToken}`)
        .send({
          latitude: CAMPUS_CENTER_LAT,
          longitude: CAMPUS_CENTER_LON,
          accuracyMeters: 5,
        });

      expect(centerRes.status).toBe(201);
      expect(centerRes.body.data.isInside).toBe(true);
      expect(centerRes.body.data.calculatedDistance).toBe(0);
      expect(centerRes.body.data.distanceFromBoundary).toBe(CAMPUS_RADIUS_METERS);

      createdPresenceLogIds.push(centerRes.body.data.id);
    });
  });

  // =========================================================================
  // 4. STUDENT STATUS, HISTORY & PRIVACY ISOLATION
  // =========================================================================
  describe('4. Student Status, History & Privacy Isolation', () => {
    it('4.1 should return the latest verified status in /my-status', async () => {
      const res = await request(app)
        .get('/api/v1/presence/my-status')
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasVerified).toBe(true);
      expect(res.body.data.status).toBeDefined();
      expect(res.body.data.latestLog).toBeDefined();
      expect(res.body.data.geofence.name).toBeDefined();
    });

    it('4.2 should allow student to retrieve their own paginated verification history', async () => {
      const res = await request(app)
        .get('/api/v1/presence/my-history?page=1&limit=10')
        .set('Authorization', `Bearer ${hostelerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.pagination.total).toBeGreaterThan(0);
      // All logs must belong to hosteler
      expect(res.body.data.every((l: any) => l.studentProfileId === hostelerStudentProfileId)).toBe(true);
    });

    it('4.3 should forbid Student from accessing other students presence endpoints (403)', async () => {
      // Student cannot access Warden overview
      const summaryRes = await request(app)
        .get('/api/v1/presence/summary')
        .set('Authorization', `Bearer ${hostelerToken}`);
      expect(summaryRes.status).toBe(403);

      // Student cannot access all students presence list
      const studentsRes = await request(app)
        .get('/api/v1/presence/students')
        .set('Authorization', `Bearer ${hostelerToken}`);
      expect(studentsRes.status).toBe(403);

      // Student cannot access Day Scholar presence history directly
      const specificStudentRes = await request(app)
        .get(`/api/v1/presence/students/${dayScholarStudentProfileId}`)
        .set('Authorization', `Bearer ${hostelerToken}`);
      expect(specificStudentRes.status).toBe(403);
    });
  });

  // =========================================================================
  // 5. WARDEN CAMPUS PRESENCE OVERSIGHT
  // =========================================================================
  describe('5. Warden Presence Oversight & Reporting', () => {
    it('5.1 should provide Warden with campus presence summary (Inside vs Outside headcount)', async () => {
      const res = await request(app)
        .get('/api/v1/presence/summary')
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.insideCount).toBeDefined();
      expect(res.body.data.outsideCount).toBeDefined();
      expect(res.body.data.verifiedCount).toBeDefined();
      expect(res.body.data.totalRegisteredStudents).toBeDefined();
      expect(res.body.data.activeGeofence).toBeDefined();
    });

    it('5.2 should allow Warden to view list of students latest presence records', async () => {
      const res = await request(app)
        .get('/api/v1/presence/students')
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const hostelerRecord = res.body.data.find(
        (s: any) => s.studentProfile.id === hostelerStudentProfileId
      );
      expect(hostelerRecord).toBeDefined();
      expect(hostelerRecord.studentProfile.firstName).toBeDefined();
      expect(hostelerRecord.studentProfile.studentType).toBe('HOSTELER');
      expect(hostelerRecord.isInside).toBeDefined();
    });

    it('5.3 should allow Warden to filter students by inside/outside status', async () => {
      const insideRes = await request(app)
        .get('/api/v1/presence/students?isInside=true')
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(insideRes.status).toBe(200);
      expect(insideRes.body.data.every((s: any) => s.isInside === true)).toBe(true);
    });

    it('5.4 should allow Warden to view a specific student presence history', async () => {
      const res = await request(app)
        .get(`/api/v1/presence/students/${hostelerStudentProfileId}`)
        .set('Authorization', `Bearer ${wardenToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.student.id).toBe(hostelerStudentProfileId);
      expect(Array.isArray(res.body.data.logs)).toBe(true);
      expect(res.body.data.logs.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 6. MESS INCHARGE & UNAUTHENTICATED ACCESS GUARDS
  // =========================================================================
  describe('6. Security, RBAC & Unauthenticated Guards', () => {
    it('6.1 should return 403 Forbidden to Mess Incharge on all Phase 7 presence routes', async () => {
      const verifyRes = await request(app)
        .post('/api/v1/presence/verify')
        .set('Authorization', `Bearer ${messToken}`)
        .send({ latitude: 12.9716, longitude: 77.5946, accuracyMeters: 10 });
      expect(verifyRes.status).toBe(403);

      const statusRes = await request(app)
        .get('/api/v1/presence/my-status')
        .set('Authorization', `Bearer ${messToken}`);
      expect(statusRes.status).toBe(403);

      const historyRes = await request(app)
        .get('/api/v1/presence/my-history')
        .set('Authorization', `Bearer ${messToken}`);
      expect(historyRes.status).toBe(403);

      const summaryRes = await request(app)
        .get('/api/v1/presence/summary')
        .set('Authorization', `Bearer ${messToken}`);
      expect(summaryRes.status).toBe(403);

      const studentsRes = await request(app)
        .get('/api/v1/presence/students')
        .set('Authorization', `Bearer ${messToken}`);
      expect(studentsRes.status).toBe(403);
    });

    it('6.2 should return 401 Unauthorized for unauthenticated requests', async () => {
      const verifyRes = await request(app).post('/api/v1/presence/verify').send({});
      expect(verifyRes.status).toBe(401);

      const statusRes = await request(app).get('/api/v1/presence/my-status');
      expect(statusRes.status).toBe(401);

      const summaryRes = await request(app).get('/api/v1/presence/summary');
      expect(summaryRes.status).toBe(401);

      const geofenceRes = await request(app).get('/api/v1/presence/geofence');
      expect(geofenceRes.status).toBe(401);
    });
  });
});
