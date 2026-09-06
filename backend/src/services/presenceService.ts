import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import {
  VerifyPresenceInput,
  CreateGeofenceInput,
  UpdateGeofenceInput,
  QueryPresenceInput,
} from '../validators/presenceValidation';

// ----------------------------------------------------
// HAVERSINE DISTANCE CALCULATION (EARTH RADIUS = 6,371,000 m)
// ----------------------------------------------------
export const calculateHaversineDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

// ----------------------------------------------------
// DEFAULT CAMPUS GEOFENCE (FALLBACK IF NONE CONFIGURED)
// ----------------------------------------------------
const DEFAULT_GEOFENCE = {
  name: 'Main University Campus',
  latitude: 12.9716, // University center latitude
  longitude: 77.5946, // University center longitude
  radiusMeters: 1000.0, // 1 km radius
  isActive: true,
};

export const getActiveGeofence = async () => {
  let geofence = await prisma.campusGeofence.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!geofence) {
    geofence = await prisma.campusGeofence.create({
      data: DEFAULT_GEOFENCE,
    });
  }

  return geofence;
};

// ----------------------------------------------------
// STUDENT PRESENCE OPERATIONS
// ----------------------------------------------------

export const verifyPresence = async (userId: string, input: VerifyPresenceInput) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found for authenticated user.', HTTP_STATUS.NOT_FOUND);
  }

  const geofence = await getActiveGeofence();

  const distance = calculateHaversineDistanceMeters(
    input.latitude,
    input.longitude,
    Number(geofence.latitude),
    Number(geofence.longitude)
  );

  // Server-authoritative boundary check: distance <= radius -> INSIDE
  const isInside = distance <= geofence.radiusMeters;
  const recordedAt = new Date(); // Authoritative server timestamp

  const log = await prisma.campusPresenceLog.create({
    data: {
      studentProfileId: student.id,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      calculatedDistance: distance,
      isInside,
      recordedAt,
    },
  });

  // Calculate distance from geofence boundary:
  // Inside: radius - distance (distance remaining until boundary)
  // Outside: distance - radius (distance needed to enter campus boundary)
  const distanceFromBoundary = isInside
    ? Math.round((geofence.radiusMeters - distance) * 100) / 100
    : Math.round((distance - geofence.radiusMeters) * 100) / 100;

  return {
    id: log.id,
    isInside: log.isInside,
    calculatedDistance: log.calculatedDistance,
    distanceFromBoundary,
    accuracyMeters: log.accuracyMeters,
    recordedAt: log.recordedAt,
    geofence: {
      id: geofence.id,
      name: geofence.name,
      radiusMeters: geofence.radiusMeters,
    },
  };
};

export const getMyStatus = async (userId: string) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found for authenticated user.', HTTP_STATUS.NOT_FOUND);
  }

  const geofence = await getActiveGeofence();

  const latestLog = await prisma.campusPresenceLog.findFirst({
    where: { studentProfileId: student.id },
    orderBy: { recordedAt: 'desc' },
  });

  if (!latestLog) {
    return {
      hasVerified: false,
      status: null,
      latestLog: null,
      geofence: {
        id: geofence.id,
        name: geofence.name,
        radiusMeters: geofence.radiusMeters,
      },
    };
  }

  const distanceFromBoundary = latestLog.isInside
    ? Math.round((geofence.radiusMeters - latestLog.calculatedDistance) * 100) / 100
    : Math.round((latestLog.calculatedDistance - geofence.radiusMeters) * 100) / 100;

  return {
    hasVerified: true,
    status: latestLog.isInside ? 'INSIDE' : 'OUTSIDE',
    latestLog: {
      id: latestLog.id,
      isInside: latestLog.isInside,
      calculatedDistance: latestLog.calculatedDistance,
      distanceFromBoundary,
      accuracyMeters: latestLog.accuracyMeters,
      recordedAt: latestLog.recordedAt,
    },
    geofence: {
      id: geofence.id,
      name: geofence.name,
      radiusMeters: geofence.radiusMeters,
    },
  };
};

export const getMyHistory = async (
  userId: string,
  query: { page: number; limit: number }
) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found for authenticated user.', HTTP_STATUS.NOT_FOUND);
  }

  const [total, logs] = await Promise.all([
    prisma.campusPresenceLog.count({
      where: { studentProfileId: student.id },
    }),
    prisma.campusPresenceLog.findMany({
      where: { studentProfileId: student.id },
      orderBy: { recordedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    logs,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

// ----------------------------------------------------
// WARDEN PRESENCE & GEOFENCE OPERATIONS
// ----------------------------------------------------

export const getPresenceSummary = async () => {
  const geofence = await getActiveGeofence();

  // Distinct by studentProfileId to evaluate latest verification record per student
  const latestLogs = await prisma.campusPresenceLog.findMany({
    distinct: ['studentProfileId'],
    orderBy: [
      { studentProfileId: 'asc' },
      { recordedAt: 'desc' },
    ],
  });

  const insideCount = latestLogs.filter((l) => l.isInside).length;
  const outsideCount = latestLogs.filter((l) => !l.isInside).length;
  const verifiedCount = latestLogs.length;

  const totalRegisteredStudents = await prisma.studentProfile.count();

  return {
    insideCount,
    outsideCount,
    verifiedCount,
    unverifiedCount: Math.max(0, totalRegisteredStudents - verifiedCount),
    totalRegisteredStudents,
    activeGeofence: {
      id: geofence.id,
      name: geofence.name,
      latitude: Number(geofence.latitude),
      longitude: Number(geofence.longitude),
      radiusMeters: geofence.radiusMeters,
      isActive: geofence.isActive,
    },
  };
};

export const getStudentsPresence = async (query: QueryPresenceInput) => {
  // Query distinct latest logs
  const latestLogs = await prisma.campusPresenceLog.findMany({
    distinct: ['studentProfileId'],
    orderBy: [
      { studentProfileId: 'asc' },
      { recordedAt: 'desc' },
    ],
    include: {
      studentProfile: {
        select: {
          id: true,
          rollNumber: true,
          firstName: true,
          lastName: true,
          department: true,
          studentType: true,
        },
      },
    },
  });

  let filtered = latestLogs;

  if (query.isInside !== undefined) {
    filtered = filtered.filter((l) => l.isInside === query.isInside);
  }

  if (query.studentType) {
    filtered = filtered.filter((l) => l.studentProfile.studentType === query.studentType);
  }

  if (query.search) {
    const s = query.search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.studentProfile.rollNumber.toLowerCase().includes(s) ||
        l.studentProfile.firstName.toLowerCase().includes(s) ||
        l.studentProfile.lastName.toLowerCase().includes(s) ||
        l.studentProfile.department.toLowerCase().includes(s)
    );
  }

  // Sort by most recently recorded
  filtered.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());

  const total = filtered.length;
  const paginated = filtered.slice((query.page - 1) * query.limit, query.page * query.limit);

  return {
    students: paginated.map((l) => ({
      id: l.id,
      isInside: l.isInside,
      calculatedDistance: l.calculatedDistance,
      accuracyMeters: l.accuracyMeters,
      recordedAt: l.recordedAt,
      studentProfile: l.studentProfile,
    })),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getStudentPresenceHistory = async (
  studentProfileId: string,
  query: { page: number; limit: number }
) => {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: {
      id: true,
      rollNumber: true,
      firstName: true,
      lastName: true,
      department: true,
      studentType: true,
    },
  });

  if (!student) {
    throw new AppError('Student profile not found.', HTTP_STATUS.NOT_FOUND);
  }

  const [total, logs] = await Promise.all([
    prisma.campusPresenceLog.count({
      where: { studentProfileId },
    }),
    prisma.campusPresenceLog.findMany({
      where: { studentProfileId },
      orderBy: { recordedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    student,
    logs,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const createGeofence = async (wardenUserId: string, input: CreateGeofenceInput) => {
  // If active, deactivate other geofences to ensure one clear active geofence
  if (input.isActive) {
    await prisma.campusGeofence.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  }

  const geofence = await prisma.campusGeofence.create({
    data: {
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
      isActive: input.isActive ?? true,
    },
  });

  // Audit log for Warden action
  await prisma.auditLog.create({
    data: {
      userId: wardenUserId,
      action: 'GEOFENCE_CREATED',
      entityType: 'CampusGeofence',
      entityId: geofence.id,
      details: JSON.stringify({
        name: geofence.name,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radiusMeters: geofence.radiusMeters,
      }),
    },
  });

  return geofence;
};

export const updateGeofence = async (
  wardenUserId: string,
  geofenceId: string,
  input: UpdateGeofenceInput
) => {
  const existing = await prisma.campusGeofence.findUnique({
    where: { id: geofenceId },
  });

  if (!existing) {
    throw new AppError('Campus geofence not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (input.isActive) {
    await prisma.campusGeofence.updateMany({
      where: { id: { not: geofenceId }, isActive: true },
      data: { isActive: false },
    });
  }

  const updated = await prisma.campusGeofence.update({
    where: { id: geofenceId },
    data: {
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
      isActive: input.isActive,
    },
  });

  // Audit log for Warden action
  await prisma.auditLog.create({
    data: {
      userId: wardenUserId,
      action: 'GEOFENCE_UPDATED',
      entityType: 'CampusGeofence',
      entityId: updated.id,
      details: JSON.stringify({
        name: updated.name,
        radiusMeters: updated.radiusMeters,
        isActive: updated.isActive,
      }),
    },
  });

  return updated;
};
