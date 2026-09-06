import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import { DayOfWeek, MealType, LeaveStatus, GuestStatus } from '@prisma/client';
import {
  CreateMessMenuInput,
  UpdateMessMenuInput,
  QueryMessMenuInput,
  CreateMessFeedbackInput,
  QueryMessFeedbackInput,
} from '../validators/messValidation';

// ----------------------------------------------------
// CONSTANTS & HELPERS
// ----------------------------------------------------

const DAYS_ORDER: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

export const getKolkataDateInfo = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const weekdayStr = getPart('weekday').toUpperCase(); // e.g. "MONDAY"

  const dateOnlyStr = `${year}-${month}-${day}`;
  const dayOfWeek = (DayOfWeek as any)[weekdayStr] as DayOfWeek;

  return { dateOnlyStr, dayOfWeek };
};

export const getDayOfWeekFromDate = (date: Date): DayOfWeek => {
  return getKolkataDateInfo(date).dayOfWeek;
};

// Meal time windows for programmatic overlap calculation in Asia/Kolkata (+05:30)
export const MEAL_TIME_WINDOWS: Record<
  MealType,
  { startHour: number; startMinute: number; endHour: number; endMinute: number } | null
> = {
  [MealType.BREAKFAST]: { startHour: 7, startMinute: 30, endHour: 9, endMinute: 30 },
  [MealType.LUNCH]: { startHour: 12, startMinute: 30, endHour: 14, endMinute: 30 },
  [MealType.SNACKS]: { startHour: 16, startMinute: 30, endHour: 17, endMinute: 30 },
  [MealType.DINNER]: { startHour: 19, startMinute: 30, endHour: 21, endMinute: 30 },
  [MealType.NONE]: null,
};

// ----------------------------------------------------
// MENU SERVICES (RECURRING WEEKLY SCHEDULE)
// ----------------------------------------------------

export const getWeeklyMenu = async (query: QueryMessMenuInput) => {
  const where: any = {};
  if (query.dayOfWeek) where.dayOfWeek = query.dayOfWeek;
  if (query.mealType) where.mealType = query.mealType;

  const menus = await prisma.messMenu.findMany({
    where,
    orderBy: [
      { dayOfWeek: 'asc' },
      { mealType: 'asc' },
    ],
    include: {
      updatedBy: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // Group by day of week for convenient client navigation
  const groupedByDay: Record<string, typeof menus> = {};
  for (const day of DAYS_ORDER) {
    groupedByDay[day] = menus.filter((m) => m.dayOfWeek === day);
  }

  return {
    menus,
    groupedByDay,
    totalConfigured: menus.length,
  };
};

export const getTodayMenu = async (targetDateString?: string) => {
  let dateOnlyStr: string;
  let dayOfWeek: DayOfWeek;

  if (targetDateString && /^\d{4}-\d{2}-\d{2}$/.test(targetDateString.trim())) {
    dateOnlyStr = targetDateString.trim();
    // Noon in Asia/Kolkata for the specified date
    const instant = new Date(`${dateOnlyStr}T12:00:00+05:30`);
    dayOfWeek = getKolkataDateInfo(instant).dayOfWeek;
  } else if (targetDateString) {
    const parsed = new Date(targetDateString);
    const instant = isNaN(parsed.getTime()) ? new Date() : parsed;
    const info = getKolkataDateInfo(instant);
    dateOnlyStr = info.dateOnlyStr;
    dayOfWeek = info.dayOfWeek;
  } else {
    const info = getKolkataDateInfo(new Date());
    dateOnlyStr = info.dateOnlyStr;
    dayOfWeek = info.dayOfWeek;
  }

  const menus = await prisma.messMenu.findMany({
    where: { dayOfWeek },
    orderBy: { mealType: 'asc' },
    include: {
      updatedBy: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const meals = {
    [MealType.BREAKFAST]: menus.find((m) => m.mealType === MealType.BREAKFAST) || null,
    [MealType.LUNCH]: menus.find((m) => m.mealType === MealType.LUNCH) || null,
    [MealType.SNACKS]: menus.find((m) => m.mealType === MealType.SNACKS) || null,
    [MealType.DINNER]: menus.find((m) => m.mealType === MealType.DINNER) || null,
  };

  return {
    date: dateOnlyStr,
    dayOfWeek,
    meals,
    totalMealsFound: menus.length,
  };
};

export const createOrUpdateMenu = async (userId: string, data: CreateMessMenuInput) => {
  const menu = await prisma.messMenu.upsert({
    where: {
      dayOfWeek_mealType: {
        dayOfWeek: data.dayOfWeek,
        mealType: data.mealType,
      },
    },
    create: {
      dayOfWeek: data.dayOfWeek,
      mealType: data.mealType,
      items: data.items,
      specialNotes: data.specialNotes,
      updatedByUserId: userId,
    },
    update: {
      items: data.items,
      specialNotes: data.specialNotes,
      updatedByUserId: userId,
    },
    include: {
      updatedBy: {
        select: { id: true, email: true, role: true },
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'MESS_MENU_CONFIGURED',
      entityType: 'MessMenu',
      entityId: menu.id,
      details: JSON.stringify({
        dayOfWeek: menu.dayOfWeek,
        mealType: menu.mealType,
        items: menu.items,
      }),
    },
  });

  return menu;
};

export const updateMenu = async (userId: string, id: string, data: UpdateMessMenuInput) => {
  const existing = await prisma.messMenu.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError('Mess menu entry not found.', HTTP_STATUS.NOT_FOUND);
  }

  const updated = await prisma.messMenu.update({
    where: { id },
    data: {
      ...(data.items !== undefined && { items: data.items }),
      ...(data.specialNotes !== undefined && { specialNotes: data.specialNotes }),
      updatedByUserId: userId,
    },
    include: {
      updatedBy: {
        select: { id: true, email: true, role: true },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'MESS_MENU_UPDATED',
      entityType: 'MessMenu',
      entityId: updated.id,
      details: JSON.stringify({
        dayOfWeek: updated.dayOfWeek,
        mealType: updated.mealType,
        items: updated.items,
      }),
    },
  });

  return updated;
};

export const deleteMenu = async (userId: string, id: string) => {
  const existing = await prisma.messMenu.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError('Mess menu entry not found.', HTTP_STATUS.NOT_FOUND);
  }

  await prisma.messMenu.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'MESS_MENU_DELETED',
      entityType: 'MessMenu',
      entityId: id,
      details: JSON.stringify({
        dayOfWeek: existing.dayOfWeek,
        mealType: existing.mealType,
      }),
    },
  });

  return { message: 'Menu entry successfully deleted.' };
};

// ----------------------------------------------------
// FEEDBACK SERVICES
// ----------------------------------------------------

export const createFeedback = async (userId: string, data: CreateMessFeedbackInput) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found. Only students can submit mess feedback.', HTTP_STATUS.NOT_FOUND);
  }

  const mealDate = new Date(`${data.mealDate}T00:00:00.000Z`);

  const feedback = await prisma.messFeedback.create({
    data: {
      studentProfileId: student.id,
      mealDate,
      mealType: data.mealType,
      rating: data.rating,
      foodQualityRating: data.foodQualityRating,
      cleanlinessRating: data.cleanlinessRating,
      comment: data.comment,
    },
    include: {
      studentProfile: {
        select: {
          id: true,
          rollNumber: true,
          firstName: true,
          lastName: true,
          studentType: true,
        },
      },
    },
  });

  return feedback;
};

export const getMyFeedback = async (userId: string, query: QueryMessFeedbackInput) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found.', HTTP_STATUS.NOT_FOUND);
  }

  const where: any = {
    studentProfileId: student.id,
  };

  if (query.mealType) where.mealType = query.mealType;
  if (query.mealDate) {
    where.mealDate = new Date(`${query.mealDate}T00:00:00.000Z`);
  }

  const [total, feedbacks] = await Promise.all([
    prisma.messFeedback.count({ where }),
    prisma.messFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    feedbacks,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getAllFeedback = async (query: QueryMessFeedbackInput) => {
  const where: any = {};
  if (query.mealType) where.mealType = query.mealType;
  if (query.mealDate) {
    where.mealDate = new Date(`${query.mealDate}T00:00:00.000Z`);
  }

  const [total, feedbacks, aggregations] = await Promise.all([
    prisma.messFeedback.count({ where }),
    prisma.messFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        studentProfile: {
          select: {
            id: true,
            rollNumber: true,
            firstName: true,
            lastName: true,
            studentType: true,
          },
        },
      },
    }),
    prisma.messFeedback.aggregate({
      where,
      _avg: {
        rating: true,
        foodQualityRating: true,
        cleanlinessRating: true,
      },
    }),
  ]);

  return {
    feedbacks,
    summary: {
      totalCount: total,
      averageRating: aggregations._avg.rating ? Number(aggregations._avg.rating.toFixed(2)) : 0,
      averageFoodQuality: aggregations._avg.foodQualityRating ? Number(aggregations._avg.foodQualityRating.toFixed(2)) : 0,
      averageCleanliness: aggregations._avg.cleanlinessRating ? Number(aggregations._avg.cleanlinessRating.toFixed(2)) : 0,
    },
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

// ----------------------------------------------------
// MEAL ELIGIBILITY & PROGRAMMATIC FORECAST CALCULATION
// ----------------------------------------------------

export const calculateExpectedMeals = async (
  dateString?: string,
  filterMealType?: MealType
) => {
  // 1. Resolve date and weekday in Asia/Kolkata (+05:30)
  let dateOnlyStr: string;
  let dayOfWeek: DayOfWeek;

  if (dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
    dateOnlyStr = dateString.trim();
    const instant = new Date(`${dateOnlyStr}T12:00:00+05:30`);
    dayOfWeek = getKolkataDateInfo(instant).dayOfWeek;
  } else if (dateString) {
    const parsed = new Date(dateString);
    const instant = isNaN(parsed.getTime()) ? new Date() : parsed;
    const info = getKolkataDateInfo(instant);
    dateOnlyStr = info.dateOnlyStr;
    dayOfWeek = info.dayOfWeek;
  } else {
    const info = getKolkataDateInfo(new Date());
    dateOnlyStr = info.dateOnlyStr;
    dayOfWeek = info.dayOfWeek;
  }

  // Calendar day boundaries in Asia/Kolkata (+05:30)
  const dayStart = new Date(`${dateOnlyStr}T00:00:00.000+05:30`);
  const dayEnd = new Date(`${dateOnlyStr}T23:59:59.999+05:30`);

  // 2. Determine eligible hostel residents:
  // Must hold an active BedAllocation (isActive = true) with an active User account.
  // Standard HOSTELERs with active allocation + temporarily authorized DAY_SCHOLARs with active allocation.
  // Inactive allocations and students without active bed allocation are excluded.
  const activeAllocations = await prisma.bedAllocation.findMany({
    where: {
      isActive: true,
      studentProfile: {
        user: { isActive: true },
      },
    },
    select: {
      studentProfileId: true,
      studentProfile: {
        select: {
          id: true,
          studentType: true,
        },
      },
    },
  });

  const eligibleResidentProfileIds = Array.from(
    new Set(activeAllocations.map((a) => a.studentProfileId))
  );
  const totalEligibleResidents = eligibleResidentProfileIds.length;

  // 3. Fetch approved leaves overlapping this day in Asia/Kolkata
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: LeaveStatus.APPROVED,
      studentProfileId: { in: eligibleResidentProfileIds },
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
    select: {
      studentProfileId: true,
      startDate: true,
      endDate: true,
    },
  });

  // 4. Fetch approved guest requests for this visit date
  const [y, m, d] = dateOnlyStr.split('-').map(Number);
  const guestVisitDate = new Date(Date.UTC(y, m - 1, d));

  const approvedGuests = await prisma.guestRequest.findMany({
    where: {
      status: GuestStatus.APPROVED,
      visitDate: guestVisitDate,
    },
    select: {
      requestedMeal: true,
      numberOfGuests: true,
    },
  });

  // Helper to compute meal expectation for a specific MealType in Asia/Kolkata
  const computeMeal = (mealType: MealType) => {
    const window = MEAL_TIME_WINDOWS[mealType];
    if (!window) {
      return {
        mealType,
        expectedMeals: 0,
        residentEligible: totalEligibleResidents,
        onLeave: 0,
        netResidents: totalEligibleResidents,
        guestMeals: 0,
      };
    }

    // Precise meal window timestamps constructed in Asia/Kolkata (+05:30)
    const pad = (n: number) => String(n).padStart(2, '0');
    const mealWindowStart = new Date(
      `${dateOnlyStr}T${pad(window.startHour)}:${pad(window.startMinute)}:00.000+05:30`
    );
    const mealWindowEnd = new Date(
      `${dateOnlyStr}T${pad(window.endHour)}:${pad(window.endMinute)}:00.000+05:30`
    );

    // Filter students on approved leave during this meal window
    const excludedStudentIds = new Set<string>();
    for (const leave of approvedLeaves) {
      if (leave.startDate <= mealWindowEnd && leave.endDate >= mealWindowStart) {
        excludedStudentIds.add(leave.studentProfileId);
      }
    }

    const onLeaveCount = excludedStudentIds.size;
    const netResidents = Math.max(0, totalEligibleResidents - onLeaveCount);

    // Sum approved guest meals for this specific meal type
    const matchingGuests = approvedGuests.filter((g) => g.requestedMeal === mealType);
    const guestMealsCount = matchingGuests.reduce((acc, g) => acc + g.numberOfGuests, 0);

    const expectedMeals = netResidents + guestMealsCount;

    return {
      mealType,
      expectedMeals,
      residentEligible: totalEligibleResidents,
      onLeave: onLeaveCount,
      netResidents,
      guestMeals: guestMealsCount,
    };
  };

  const mealTypesToCalculate: MealType[] = filterMealType && filterMealType !== MealType.NONE
    ? [filterMealType]
    : [MealType.BREAKFAST, MealType.LUNCH, MealType.SNACKS, MealType.DINNER];

  const breakdown: Record<string, ReturnType<typeof computeMeal>> = {};
  for (const m of mealTypesToCalculate) {
    breakdown[m] = computeMeal(m);
  }

  return {
    date: dateOnlyStr,
    dayOfWeek,
    totalEligibleResidents,
    breakdown,
  };
};

export const getMessDashboardAnalytics = async (dateString?: string) => {
  const expectedMealsToday = await calculateExpectedMeals(dateString);

  // Fetch feedback metrics (overall average + counts)
  const [totalFeedbacks, ratingsAgg] = await Promise.all([
    prisma.messFeedback.count(),
    prisma.messFeedback.aggregate({
      _avg: {
        rating: true,
        foodQualityRating: true,
        cleanlinessRating: true,
      },
    }),
  ]);

  // Fetch 7-day forecast trend (starting from target date in Asia/Kolkata)
  const [baseY, baseM, baseD] = expectedMealsToday.date.split('-').map(Number);
  const trend = [];
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(Date.UTC(baseY, baseM - 1, baseD + i));
    const dayStr = currentDay.toISOString().slice(0, 10);
    const dayResult = await calculateExpectedMeals(dayStr);
    trend.push({
      date: dayStr,
      dayOfWeek: dayResult.dayOfWeek,
      breakfast: dayResult.breakdown[MealType.BREAKFAST]?.expectedMeals ?? 0,
      lunch: dayResult.breakdown[MealType.LUNCH]?.expectedMeals ?? 0,
      dinner: dayResult.breakdown[MealType.DINNER]?.expectedMeals ?? 0,
    });
  }

  return {
    today: expectedMealsToday,
    satisfaction: {
      totalFeedbacks,
      averageRating: ratingsAgg._avg.rating ? Number(ratingsAgg._avg.rating.toFixed(2)) : 0,
      averageFoodQuality: ratingsAgg._avg.foodQualityRating ? Number(ratingsAgg._avg.foodQualityRating.toFixed(2)) : 0,
      averageCleanliness: ratingsAgg._avg.cleanlinessRating ? Number(ratingsAgg._avg.cleanlinessRating.toFixed(2)) : 0,
    },
    weeklyTrend: trend,
  };
};
