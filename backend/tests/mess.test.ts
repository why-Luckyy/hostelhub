import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/config/db';
import { generateAccessToken } from '../src/services/authService';
import { ROLES, STUDENT_TYPES } from '../src/constants/roles';
import { DayOfWeek, MealType, LeaveStatus, GuestStatus } from '@prisma/client';

describe('Phase 5: Mess Management & Meal Analytics End-to-End Suite', () => {
  jest.setTimeout(60000);

  let wardenToken: string;
  let messToken: string;
  let studentToken: string;
  let dayScholarToken: string;

  let wardenUserId: string;
  let messUserId: string;
  let hostelerStudentProfileId: string;
  let dayScholarStudentProfileId: string;
  let hostelerUserId: string;

  // Cleanup tracking arrays
  const createdMenuIds: string[] = [];
  const createdFeedbackIds: string[] = [];
  const createdLeaveIds: string[] = [];
  const createdGuestRequestIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch seeded test accounts
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
      throw new Error('Required seeded accounts not found. Please run seed script first.');
    }

    wardenUserId = warden.id;
    messUserId = mess.id;
    hostelerStudentProfileId = hosteler.studentProfile.id;
    dayScholarStudentProfileId = dayScholar.studentProfile.id;
    hostelerUserId = hosteler.id;

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
      if (createdFeedbackIds.length > 0) {
        await prisma.messFeedback.deleteMany({
          where: { id: { in: createdFeedbackIds } },
        });
      }
      if (createdMenuIds.length > 0) {
        await prisma.messMenu.deleteMany({
          where: { id: { in: createdMenuIds } },
        });
      }
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
  // 1. MESS MENU MANAGEMENT & PERSISTENCE
  // ----------------------------------------------------
  describe('1. Mess Menu Management & Recurring Persistence', () => {
    let createdMenuId: string;
    let deleteTargetMenuId: string;

    it('Mess Incharge can create a recurring menu entry (201)', async () => {
      const res = await request(app)
        .post('/api/v1/mess/menu')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          dayOfWeek: DayOfWeek.MONDAY,
          mealType: MealType.BREAKFAST,
          items: 'Idli, Medu Vada, Sambar, Coconut Chutney, Filter Coffee',
          specialNotes: 'Freshly steamed hot idlis with ghee',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dayOfWeek).toBe('MONDAY');
      expect(res.body.data.mealType).toBe('BREAKFAST');
      expect(res.body.data.items).toContain('Idli, Medu Vada');
      createdMenuId = res.body.data.id;
      createdMenuIds.push(createdMenuId);
    });

    it('Mess Incharge can create a second meal entry (e.g. LUNCH) (201)', async () => {
      const res = await request(app)
        .post('/api/v1/mess/menu')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          dayOfWeek: DayOfWeek.MONDAY,
          mealType: MealType.LUNCH,
          items: 'Steamed Rice, Dal Tadka, Paneer Butter Masala, Roti, Curd',
          specialNotes: 'Special North Indian thali',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.dayOfWeek).toBe('MONDAY');
      expect(res.body.data.mealType).toBe('LUNCH');
      createdMenuIds.push(res.body.data.id);
    });

    it('Mess Incharge can update an existing menu entry (200)', async () => {
      const res = await request(app)
        .put(`/api/v1/mess/menu/${createdMenuId}`)
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          items: 'Masala Dosa, Sambar, Mint Chutney, Tea/Coffee',
          specialNotes: 'Crispy dosas made with clarified butter',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toContain('Masala Dosa');
      expect(res.body.data.specialNotes).toContain('Crispy dosas');
    });

    it('Menu entry for (dayOfWeek, mealType) persists across weeks until updated or deleted', async () => {
      const res = await request(app)
        .get('/api/v1/mess/menu?dayOfWeek=MONDAY')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.menus).toBeDefined();
      const mondayBreakfast = res.body.data.menus.find(
        (m: any) => m.dayOfWeek === 'MONDAY' && m.mealType === 'BREAKFAST'
      );
      expect(mondayBreakfast).toBeDefined();
      expect(mondayBreakfast.items).toContain('Masala Dosa');
    });

    it('Student can view the full weekly menu (200)', async () => {
      const res = await request(app)
        .get('/api/v1/mess/menu')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.groupedByDay).toBeDefined();
      expect(res.body.data.groupedByDay.MONDAY.length).toBeGreaterThanOrEqual(2);
    });

    it("Student can view today's dynamically resolved menu (200)", async () => {
      const res = await request(app)
        .get('/api/v1/mess/menu/today')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.date).toBeDefined();
      expect(res.body.data.dayOfWeek).toBeDefined();
      expect(res.body.data.meals).toBeDefined();
    });

    it('Mess Incharge can delete a menu entry (200)', async () => {
      // Create a temporary entry to delete
      const createRes = await request(app)
        .post('/api/v1/mess/menu')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          dayOfWeek: DayOfWeek.FRIDAY,
          mealType: MealType.SNACKS,
          items: 'Samosa, Masala Chai',
        });

      deleteTargetMenuId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/mess/menu/${deleteTargetMenuId}`)
        .set('Authorization', `Bearer ${messToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify in DB
      const inDb = await prisma.messMenu.findUnique({ where: { id: deleteTargetMenuId } });
      expect(inDb).toBeNull();
    });

    it('Student CANNOT create or modify mess menus (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/mess/menu')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          dayOfWeek: DayOfWeek.TUESDAY,
          mealType: MealType.DINNER,
          items: 'Unauthorized Menu Entry',
        });

      expect(res.status).toBe(403);
    });

    it('Warden CANNOT create or modify mess menus (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/mess/menu')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({
          dayOfWeek: DayOfWeek.TUESDAY,
          mealType: MealType.DINNER,
          items: 'Warden Menu Attempt',
        });

      expect(res.status).toBe(403);
    });
  });

  // ----------------------------------------------------
  // 2. MESS FEEDBACK
  // ----------------------------------------------------
  describe('2. Student Mess Feedback & Ratings', () => {
    let createdFeedbackId: string;

    it('Student can submit valid mess feedback with 1-5 ratings (201)', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);

      const res = await request(app)
        .post('/api/v1/mess/feedback')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          mealDate: todayStr,
          mealType: 'BREAKFAST',
          rating: 4,
          foodQualityRating: 5,
          cleanlinessRating: 4,
          comment: 'Dosas were hot, fresh, and chutneys were delicious!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(4);
      expect(res.body.data.foodQualityRating).toBe(5);
      expect(res.body.data.cleanlinessRating).toBe(4);
      expect(res.body.data.comment).toContain('Dosas were hot');
      createdFeedbackId = res.body.data.id;
      createdFeedbackIds.push(createdFeedbackId);
    });

    it('Invalid rating (> 5 or < 1) is rejected with 422 Unprocessable Entity', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);

      const res = await request(app)
        .post('/api/v1/mess/feedback')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          mealDate: todayStr,
          mealType: 'LUNCH',
          rating: 6, // Invalid > 5
          foodQualityRating: 0, // Invalid < 1
          cleanlinessRating: 3,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'rating' }),
          expect.objectContaining({ field: 'foodQualityRating' }),
        ])
      );
    });

    it('Feedback for a future date is rejected with 422 Unprocessable Entity', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);

      const res = await request(app)
        .post('/api/v1/mess/feedback')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          mealDate: futureDate,
          mealType: 'DINNER',
          rating: 3,
          foodQualityRating: 3,
          cleanlinessRating: 3,
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'mealDate' }),
        ])
      );
    });

    it('Student can view their own feedback history (200)', async () => {
      const res = await request(app)
        .get('/api/v1/mess/feedback/my-feedback')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((f: any) => f.id === createdFeedbackId);
      expect(found).toBeDefined();
    });

    it('Mess Incharge can view all student feedback with aggregated statistics (200)', async () => {
      const res = await request(app)
        .get('/api/v1/mess/feedback')
        .set('Authorization', `Bearer ${messToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.feedbacks)).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.totalCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.summary.averageRating).toBeGreaterThanOrEqual(1);
    });

    it('Mess Incharge cannot submit student feedback (404/403: student profile required)', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);

      const res = await request(app)
        .post('/api/v1/mess/feedback')
        .set('Authorization', `Bearer ${messToken}`)
        .send({
          mealDate: todayStr,
          mealType: 'LUNCH',
          rating: 5,
          foodQualityRating: 5,
          cleanlinessRating: 5,
        });

      expect(res.status).toBe(403);
    });
  });

  // ----------------------------------------------------
  // 3. MEAL ELIGIBILITY & PROGRAMMATIC FORECAST CALCULATION
  // ----------------------------------------------------
  describe('3. Programmatic Expected Meal Forecast Calculation', () => {
    const testDate = '2026-10-15';

    it('Calculates baseline expected meals for eligible active hostel residents (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}`)
        .set('Authorization', `Bearer ${messToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.date).toBe(testDate);
      expect(res.body.data.totalEligibleResidents).toBeGreaterThanOrEqual(1);

      const breakfast = res.body.data.breakdown.BREAKFAST;
      expect(breakfast).toBeDefined();
      expect(breakfast.residentEligible).toBe(res.body.data.totalEligibleResidents);
      expect(breakfast.expectedMeals).toBe(breakfast.netResidents + breakfast.guestMeals);
    });

    it('Day Scholar without residential allocation is NOT counted in baseline meals', async () => {
      // Count total active BedAllocations
      const activeAllocationsCount = await prisma.bedAllocation.count({
        where: {
          isActive: true,
          studentProfile: { user: { isActive: true } },
        },
      });

      const res = await request(app)
        .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}`)
        .set('Authorization', `Bearer ${messToken}`);

      expect(res.body.data.totalEligibleResidents).toBe(activeAllocationsCount);
    });

    it('Temporarily authorized Day Scholar with active BedAllocation IS included in expected meals', async () => {
      const room102 = await prisma.room.findFirst({
        where: { roomNumber: '102' },
        include: { beds: true },
      });

      if (!room102 || room102.beds.length === 0) {
        throw new Error('Room 102 beds not found in seeded database');
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

      try {
        const res = await request(app)
          .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}`)
          .set('Authorization', `Bearer ${messToken}`);

        expect(res.status).toBe(200);
        // Eligible count must reflect the newly added resident
        const activeAllocationsCount = await prisma.bedAllocation.count({
          where: {
            isActive: true,
            studentProfile: { user: { isActive: true } },
          },
        });
        expect(res.body.data.totalEligibleResidents).toBe(activeAllocationsCount);
      } finally {
        await prisma.bedAllocation.delete({ where: { id: tempAllocation.id } });
      }
    });

    it('Approved leave overlapping meal window properly subtracts from expected meals', async () => {
      // 1. Check baseline lunch
      const baselineRes = await request(app)
        .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}&mealType=LUNCH`)
        .set('Authorization', `Bearer ${messToken}`);

      const baselineLunchExpected = baselineRes.body.data.breakdown.LUNCH.expectedMeals;

      // 2. Create an approved leave covering October 15 Lunch (12:30 - 14:30 IST)
      const approvedLeave = await prisma.leaveRequest.create({
        data: {
          studentProfileId: hostelerStudentProfileId,
          startDate: new Date('2026-10-15T11:00:00+05:30'),
          endDate: new Date('2026-10-15T16:00:00+05:30'),
          destination: 'City Hospital',
          emergencyContact: '+919876543211',
          reason: 'Medical appointment',
          status: LeaveStatus.APPROVED,
          reviewedByAdminId: wardenUserId,
        },
      });
      createdLeaveIds.push(approvedLeave.id);

      // 3. Recalculate
      const leaveRes = await request(app)
        .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}&mealType=LUNCH`)
        .set('Authorization', `Bearer ${messToken}`);

      const newLunch = leaveRes.body.data.breakdown.LUNCH;
      expect(newLunch.onLeave).toBeGreaterThanOrEqual(1);
      expect(newLunch.expectedMeals).toBe(baselineLunchExpected - 1);
    });

    it('Cancelled or rejected leave does NOT subtract from expected meals', async () => {
      // Check dinner baseline
      const baselineRes = await request(app)
        .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}&mealType=DINNER`)
        .set('Authorization', `Bearer ${messToken}`);

      const baselineDinner = baselineRes.body.data.breakdown.DINNER.expectedMeals;

      // Create a CANCELLED leave covering dinner (19:30 - 21:30 IST)
      const cancelledLeave = await prisma.leaveRequest.create({
        data: {
          studentProfileId: hostelerStudentProfileId,
          startDate: new Date('2026-10-15T18:00:00+05:30'),
          endDate: new Date('2026-10-15T22:30:00+05:30'),
          destination: 'Movie',
          emergencyContact: '+919876543211',
          reason: 'Weekend outing',
          status: LeaveStatus.CANCELLED,
        },
      });
      createdLeaveIds.push(cancelledLeave.id);

      // Create a REJECTED leave covering dinner (19:30 - 21:30 IST)
      const rejectedLeave = await prisma.leaveRequest.create({
        data: {
          studentProfileId: hostelerStudentProfileId,
          startDate: new Date('2026-10-15T18:00:00+05:30'),
          endDate: new Date('2026-10-15T22:30:00+05:30'),
          destination: 'Party',
          emergencyContact: '+919876543211',
          reason: 'Friends party',
          status: LeaveStatus.REJECTED,
          reviewedByAdminId: wardenUserId,
        },
      });
      createdLeaveIds.push(rejectedLeave.id);

      const afterRes = await request(app)
        .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}&mealType=DINNER`)
        .set('Authorization', `Bearer ${messToken}`);

      expect(afterRes.body.data.breakdown.DINNER.expectedMeals).toBe(baselineDinner);
    });

    it('Approved guest request with requested meal increases expected meals count by numberOfGuests', async () => {
      const baselineRes = await request(app)
        .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}&mealType=LUNCH`)
        .set('Authorization', `Bearer ${messToken}`);

      const baselineLunch = baselineRes.body.data.breakdown.LUNCH.expectedMeals;

      // Create approved guest request for 2 guests for LUNCH on testDate
      const guestReq = await prisma.guestRequest.create({
        data: {
          hostStudentProfileId: hostelerStudentProfileId,
          guestName: 'Sunita Sharma',
          relationship: 'Mother',
          visitDate: new Date('2026-10-15T00:00:00.000Z'),
          requestedMeal: MealType.LUNCH,
          numberOfGuests: 2,
          reason: 'Family visit',
          status: GuestStatus.APPROVED,
          reviewedByAdminId: wardenUserId,
          guestPass: {
            create: {
              passCode: 'GP-20261015-8899',
              validOn: new Date('2026-10-15T00:00:00.000Z'),
            },
          },
        },
      });
      createdGuestRequestIds.push(guestReq.id);

      const afterGuestRes = await request(app)
        .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}&mealType=LUNCH`)
        .set('Authorization', `Bearer ${messToken}`);

      const updatedLunch = afterGuestRes.body.data.breakdown.LUNCH;
      expect(updatedLunch.guestMeals).toBeGreaterThanOrEqual(2);
      expect(updatedLunch.expectedMeals).toBe(baselineLunch + 2);
    });

    it('Rejected guest request does NOT increase expected meals count', async () => {
      const baselineRes = await request(app)
        .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}&mealType=BREAKFAST`)
        .set('Authorization', `Bearer ${messToken}`);

      const baselineBreakfast = baselineRes.body.data.breakdown.BREAKFAST.expectedMeals;

      const rejectedGuestReq = await prisma.guestRequest.create({
        data: {
          hostStudentProfileId: hostelerStudentProfileId,
          guestName: 'Random Visitor',
          relationship: 'Friend',
          visitDate: new Date('2026-10-15T00:00:00.000Z'),
          requestedMeal: MealType.BREAKFAST,
          numberOfGuests: 3,
          reason: 'Casual meeting',
          status: GuestStatus.REJECTED,
          reviewedByAdminId: wardenUserId,
        },
      });
      createdGuestRequestIds.push(rejectedGuestReq.id);

      const afterRes = await request(app)
        .get(`/api/v1/mess/analytics/expected-meals?date=${testDate}&mealType=BREAKFAST`)
        .set('Authorization', `Bearer ${messToken}`);

      expect(afterRes.body.data.breakdown.BREAKFAST.expectedMeals).toBe(baselineBreakfast);
    });

    it('Mess Incharge dashboard endpoint returns today forecast, feedback satisfaction, and 7-day trend (200)', async () => {
      const res = await request(app)
        .get(`/api/v1/mess/analytics/dashboard?date=${testDate}`)
        .set('Authorization', `Bearer ${messToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.today).toBeDefined();
      expect(res.body.data.satisfaction).toBeDefined();
      expect(Array.isArray(res.body.data.weeklyTrend)).toBe(true);
      expect(res.body.data.weeklyTrend.length).toBe(7);
    });

    it('Student CANNOT access mess analytics or dashboard endpoints (403 Forbidden)', async () => {
      const res1 = await request(app)
        .get('/api/v1/mess/analytics/expected-meals')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .get('/api/v1/mess/analytics/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res2.status).toBe(403);
    });
  });

  // ----------------------------------------------------
  // 4. AUDIT LOGGING & AUTHENTICATION
  // ----------------------------------------------------
  describe('4. Audit Logging & Security Guards', () => {
    it('Menu modifications create appropriate AuditLog entries in database', async () => {
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityType: 'MessMenu',
          action: 'MESS_MENU_CONFIGURED',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(messUserId);
    });

    it('Unauthenticated requests to mess endpoints return 401 Unauthorized', async () => {
      const res1 = await request(app).get('/api/v1/mess/menu');
      expect(res1.status).toBe(401);

      const res2 = await request(app).get('/api/v1/mess/feedback/my-feedback');
      expect(res2.status).toBe(401);

      const res3 = await request(app).get('/api/v1/mess/analytics/dashboard');
      expect(res3.status).toBe(401);
    });
  });
});
