import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import {
  MessStaffRole,
  StaffAttendanceStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import {
  CreateStaffInput,
  UpdateStaffInput,
  CheckInStaffInput,
  CheckOutStaffInput,
  MarkAttendanceInput,
  QueryStaffAttendanceInput,
} from '../validators/staffValidation';

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';
export const LATE_GRACE_PERIOD_MINUTES = 15;

/**
 * Extracts YYYY-MM-DD string and canonical Date object in Asia/Kolkata (+05:30)
 */
export const getKolkataDateInfo = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');

  const dateOnlyStr = `${year}-${month}-${day}`;
  const canonicalDate = new Date(`${dateOnlyStr}T00:00:00.000Z`);

  return { dateOnlyStr, canonicalDate };
};

/**
 * Calculates late arrival metrics against expected shift start time in Asia/Kolkata
 */
export const calculatePunctuality = (
  expectedStartTime: string,
  checkInTime: Date,
  graceMinutes: number = LATE_GRACE_PERIOD_MINUTES
) => {
  const [expH, expM] = expectedStartTime.split(':').map(Number);

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timeParts = timeFormatter.formatToParts(checkInTime);
  const checkInH = parseInt(timeParts.find((p) => p.type === 'hour')?.value || '0', 10);
  const checkInM = parseInt(timeParts.find((p) => p.type === 'minute')?.value || '0', 10);

  const checkInTotalMinutes = checkInH * 60 + checkInM;
  const expectedTotalMinutes = expH * 60 + expM;
  const diffMinutes = checkInTotalMinutes - expectedTotalMinutes;

  if (diffMinutes > graceMinutes) {
    return {
      isLate: true,
      lateMinutes: diffMinutes,
      status: StaffAttendanceStatus.LATE,
    };
  }

  return {
    isLate: false,
    lateMinutes: 0,
    status: StaffAttendanceStatus.PRESENT,
  };
};

// ============================================================================
// STAFF MANAGEMENT SERVICES
// ============================================================================

/**
 * Register a new mess operational staff member
 */
export const createStaff = async (data: CreateStaffInput, userId: string) => {
  const staff = await prisma.messStaff.create({
    data: {
      name: data.name,
      role: data.role as MessStaffRole,
      phone: data.phone || null,
      expectedStartTime: data.expectedStartTime || '06:30',
      isActive: true,
      createdByUserId: userId,
    },
  });

  // Record AuditLog
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'STAFF_CREATED',
      entityType: 'MESS_STAFF',
      entityId: staff.id,
      details: JSON.stringify({
        name: staff.name,
        role: staff.role,
        expectedStartTime: staff.expectedStartTime,
      }),
    },
  });

  return staff;
};

/**
 * Get all mess staff members with optional filtering
 */
export const getAllStaff = async (query: {
  role?: MessStaffRole;
  isActive?: boolean;
  search?: string;
}) => {
  const where: Prisma.MessStaffWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }

  if (typeof query.isActive === 'boolean') {
    where.isActive = query.isActive;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return prisma.messStaff.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
};

/**
 * Retrieve single mess staff member by ID
 */
export const getStaffById = async (staffId: string) => {
  const staff = await prisma.messStaff.findUnique({
    where: { id: staffId },
    include: {
      attendanceRecords: {
        orderBy: { date: 'desc' },
        take: 10,
      },
    },
  });

  if (!staff) {
    throw new AppError('Mess staff member not found', HTTP_STATUS.NOT_FOUND);
  }

  return staff;
};

/**
 * Update mess staff profile details
 */
export const updateStaff = async (
  staffId: string,
  data: UpdateStaffInput,
  userId: string
) => {
  const existing = await prisma.messStaff.findUnique({ where: { id: staffId } });
  if (!existing) {
    throw new AppError('Mess staff member not found', HTTP_STATUS.NOT_FOUND);
  }

  const updated = await prisma.messStaff.update({
    where: { id: staffId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.role && { role: data.role as MessStaffRole }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.expectedStartTime && { expectedStartTime: data.expectedStartTime }),
      ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
    },
  });

  if (typeof data.isActive === 'boolean' && data.isActive !== existing.isActive) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: data.isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED',
        entityType: 'MESS_STAFF',
        entityId: staffId,
        details: JSON.stringify({ staffName: updated.name, isActive: data.isActive }),
      },
    });
  }

  return updated;
};

/**
 * Toggle active/inactive status of a staff member
 */
export const toggleStaffStatus = async (
  staffId: string,
  isActive: boolean,
  userId: string
) => {
  return updateStaff(staffId, { isActive }, userId);
};

// ============================================================================
// ATTENDANCE SERVICES
// ============================================================================

/**
 * Quick check-in for an active staff member with automatic punctuality calculation
 */
export const checkInStaff = async (data: CheckInStaffInput, userId: string) => {
  const staff = await prisma.messStaff.findUnique({ where: { id: data.staffId } });
  if (!staff) {
    throw new AppError('Mess staff member not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!staff.isActive) {
    throw new AppError(
      'Cannot check in an inactive staff member. Please activate the worker first.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const checkInTimestamp = data.checkInTime || new Date();
  const { canonicalDate } = getKolkataDateInfo(checkInTimestamp);

  // Check if attendance already recorded today
  const existing = await prisma.staffAttendance.findUnique({
    where: {
      staffId_date: {
        staffId: staff.id,
        date: canonicalDate,
      },
    },
  });

  if (existing) {
    throw new AppError(
      `Attendance has already been recorded for ${staff.name} on this date. Current status: ${existing.status}.`,
      HTTP_STATUS.CONFLICT
    );
  }

  // Calculate punctuality metrics
  const { isLate, lateMinutes, status } = calculatePunctuality(
    staff.expectedStartTime,
    checkInTimestamp
  );

  const attendance = await prisma.staffAttendance.create({
    data: {
      staffId: staff.id,
      date: canonicalDate,
      status,
      checkInTime: checkInTimestamp,
      expectedStartTime: staff.expectedStartTime,
      isLate,
      lateMinutes,
      remarks: data.remarks || null,
      markedByUserId: userId,
    },
    include: { staff: true },
  });

  // If Cook is significantly late (> 30 mins), trigger in-app notification to Mess Incharge
  if (isLate && lateMinutes > 30 && staff.role === MessStaffRole.COOK) {
    await prisma.notification.create({
      data: {
        userId,
        title: '⚠️ Cook Late Arrival Alert',
        message: `Cook ${staff.name} checked in ${lateMinutes} minutes late (Shift: ${staff.expectedStartTime}). Kitchen meal preparation may be impacted.`,
        type: NotificationType.MESS,
        data: JSON.stringify({
          staffId: staff.id,
          attendanceId: attendance.id,
          lateMinutes,
        }),
      },
    });
  }

  return attendance;
};

/**
 * Record check-out time for a staff member who checked in today
 */
export const checkOutStaff = async (data: CheckOutStaffInput, userId: string) => {
  const staff = await prisma.messStaff.findUnique({ where: { id: data.staffId } });
  if (!staff) {
    throw new AppError('Mess staff member not found', HTTP_STATUS.NOT_FOUND);
  }

  const checkOutTimestamp = data.checkOutTime || new Date();
  const { canonicalDate } = getKolkataDateInfo(checkOutTimestamp);

  const attendance = await prisma.staffAttendance.findUnique({
    where: {
      staffId_date: {
        staffId: staff.id,
        date: canonicalDate,
      },
    },
  });

  if (!attendance) {
    throw new AppError(
      `No check-in record found for ${staff.name} on this date. Please check in the staff member before checking out.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (attendance.checkOutTime) {
    throw new AppError(
      `Staff member ${staff.name} has already checked out at ${attendance.checkOutTime.toISOString()}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  return prisma.staffAttendance.update({
    where: { id: attendance.id },
    data: {
      checkOutTime: checkOutTimestamp,
      ...(data.remarks && {
        remarks: attendance.remarks
          ? `${attendance.remarks} | Out: ${data.remarks}`
          : data.remarks,
      }),
    },
    include: { staff: true },
  });
};

/**
 * Explicitly mark attendance (e.g. ABSENT, HALF_DAY, or manual override)
 */
export const markAttendance = async (data: MarkAttendanceInput, userId: string) => {
  const staff = await prisma.messStaff.findUnique({ where: { id: data.staffId } });
  if (!staff) {
    throw new AppError('Mess staff member not found', HTTP_STATUS.NOT_FOUND);
  }

  const targetDate = data.date ? new Date(data.date) : new Date();
  const { canonicalDate } = getKolkataDateInfo(targetDate);

  const existing = await prisma.staffAttendance.findUnique({
    where: {
      staffId_date: {
        staffId: staff.id,
        date: canonicalDate,
      },
    },
  });

  let isLate = false;
  let lateMinutes = 0;

  if (data.status === StaffAttendanceStatus.LATE || data.checkInTime) {
    const checkIn = data.checkInTime || new Date();
    const punctuality = calculatePunctuality(staff.expectedStartTime, checkIn);
    isLate = punctuality.isLate;
    lateMinutes = punctuality.lateMinutes;
  }

  const result = await prisma.staffAttendance.upsert({
    where: {
      staffId_date: {
        staffId: staff.id,
        date: canonicalDate,
      },
    },
    create: {
      staffId: staff.id,
      date: canonicalDate,
      status: data.status as StaffAttendanceStatus,
      checkInTime: data.checkInTime || null,
      checkOutTime: data.checkOutTime || null,
      expectedStartTime: staff.expectedStartTime,
      isLate,
      lateMinutes,
      remarks: data.remarks || null,
      markedByUserId: userId,
    },
    update: {
      status: data.status as StaffAttendanceStatus,
      ...(data.checkInTime !== undefined && { checkInTime: data.checkInTime }),
      ...(data.checkOutTime !== undefined && { checkOutTime: data.checkOutTime }),
      isLate,
      lateMinutes,
      ...(data.remarks !== undefined && { remarks: data.remarks }),
      markedByUserId: userId,
    },
    include: { staff: true },
  });

  // Audit if overriding an existing record
  if (existing) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ATTENDANCE_OVERRIDDEN',
        entityType: 'STAFF_ATTENDANCE',
        entityId: result.id,
        details: JSON.stringify({
          staffName: staff.name,
          oldStatus: existing.status,
          newStatus: data.status,
          date: canonicalDate.toISOString().split('T')[0],
        }),
      },
    });
  }

  // Alert if a Cook is marked Absent
  if (data.status === StaffAttendanceStatus.ABSENT && staff.role === MessStaffRole.COOK) {
    await prisma.notification.create({
      data: {
        userId,
        title: '🚨 Cook Marked Absent',
        message: `Cook ${staff.name} was marked ABSENT for ${canonicalDate.toISOString().split('T')[0]}. Ensure kitchen coverage is arranged.`,
        type: NotificationType.MESS,
        data: JSON.stringify({
          staffId: staff.id,
          date: canonicalDate.toISOString().split('T')[0],
        }),
      },
    });
  }

  return result;
};

/**
 * Retrieve today's complete roster of active staff with their current attendance state
 */
export const getTodayRoster = async (dateStr?: string) => {
  let canonicalDate: Date;
  let dateFormattedStr: string;

  if (dateStr) {
    dateFormattedStr = dateStr;
    canonicalDate = new Date(`${dateStr}T00:00:00.000Z`);
  } else {
    const info = getKolkataDateInfo(new Date());
    canonicalDate = info.canonicalDate;
    dateFormattedStr = info.dateOnlyStr;
  }

  // Fetch all active staff
  const activeStaff = await prisma.messStaff.findMany({
    where: { isActive: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  // Fetch attendance records for target date
  const attendances = await prisma.staffAttendance.findMany({
    where: { date: canonicalDate },
    include: { staff: true },
  });

  const attendanceMap = new Map<string, typeof attendances[0]>();
  attendances.forEach((att) => attendanceMap.set(att.staffId, att));

  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;
  let pendingCount = 0;

  const records = activeStaff.map((staff) => {
    const att = attendanceMap.get(staff.id) || null;
    if (!att) {
      pendingCount++;
      return {
        staff,
        attendance: null,
        isPending: true,
      };
    }

    if (att.status === StaffAttendanceStatus.PRESENT) presentCount++;
    else if (att.status === StaffAttendanceStatus.LATE) lateCount++;
    else if (att.status === StaffAttendanceStatus.ABSENT) absentCount++;
    else if (att.status === StaffAttendanceStatus.HALF_DAY) halfDayCount++;

    return {
      staff,
      attendance: att,
      isPending: false,
    };
  });

  return {
    date: dateFormattedStr,
    totalActiveStaff: activeStaff.length,
    presentCount,
    lateCount,
    absentCount,
    halfDayCount,
    pendingCount,
    records,
  };
};

/**
 * Attendance summary statistics across an optional date range
 */
export const getAttendanceSummary = async (startDateStr?: string, endDateStr?: string) => {
  const where: Prisma.StaffAttendanceWhereInput = {};

  if (startDateStr || endDateStr) {
    where.date = {};
    if (startDateStr) {
      where.date.gte = new Date(`${startDateStr}T00:00:00.000Z`);
    }
    if (endDateStr) {
      where.date.lte = new Date(`${endDateStr}T00:00:00.000Z`);
    }
  }

  const [totalRecords, presentCount, lateCount, absentCount, halfDayCount] =
    await Promise.all([
      prisma.staffAttendance.count({ where }),
      prisma.staffAttendance.count({
        where: { ...where, status: StaffAttendanceStatus.PRESENT },
      }),
      prisma.staffAttendance.count({
        where: { ...where, status: StaffAttendanceStatus.LATE },
      }),
      prisma.staffAttendance.count({
        where: { ...where, status: StaffAttendanceStatus.ABSENT },
      }),
      prisma.staffAttendance.count({
        where: { ...where, status: StaffAttendanceStatus.HALF_DAY },
      }),
    ]);

  return {
    totalRecords,
    presentCount,
    lateCount,
    absentCount,
    halfDayCount,
    onTimePercentage:
      totalRecords > 0
        ? Math.round((presentCount / (presentCount + lateCount || 1)) * 100)
        : 100,
  };
};

/**
 * Paginated historical attendance logs
 */
export const getAttendanceHistory = async (params: QueryStaffAttendanceInput) => {
  const { page = 1, limit = 20, date, startDate, endDate, staffId, role, status } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.StaffAttendanceWhereInput = {};

  if (date) {
    where.date = new Date(`${date}T00:00:00.000Z`);
  } else if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      where.date.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      where.date.lte = new Date(`${endDate}T00:00:00.000Z`);
    }
  }

  if (staffId) {
    where.staffId = staffId;
  }

  if (status) {
    where.status = status as StaffAttendanceStatus;
  }

  if (role) {
    where.staff = { role: role as MessStaffRole };
  }

  const [total, records] = await Promise.all([
    prisma.staffAttendance.count({ where }),
    prisma.staffAttendance.findMany({
      where,
      include: { staff: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
  ]);

  return {
    records,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
