import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import { ComplaintStatus, NotificationType } from '@prisma/client';
import {
  CreateComplaintInput,
  ResolveComplaintInput,
  QueryComplaintsInput,
} from '../validators/complaintValidation';

// ----------------------------------------------------
// HELPER FOR STRICT PENDING <-> SOLVED STATUS MAPPING
// ----------------------------------------------------
// DB: SUBMITTED  <-> API: PENDING
// DB: RESOLVED   <-> API: SOLVED
export const mapDbStatusToApi = (status: ComplaintStatus): 'PENDING' | 'SOLVED' => {
  if (status === ComplaintStatus.RESOLVED) {
    return 'SOLVED';
  }
  return 'PENDING';
};

export const mapApiStatusToDb = (status?: 'PENDING' | 'SOLVED'): ComplaintStatus | undefined => {
  if (!status) return undefined;
  if (status === 'SOLVED') return ComplaintStatus.RESOLVED;
  return ComplaintStatus.SUBMITTED;
};

const formatComplaint = (c: any) => ({
  id: c.id,
  studentProfileId: c.studentProfileId,
  title: c.title,
  description: c.description,
  category: c.category,
  status: mapDbStatusToApi(c.status),
  priority: c.priority,
  assignedTo: c.assignedTo,
  resolutionNotes: c.resolutionNotes,
  resolvedAt: c.resolvedAt,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  studentProfile: c.studentProfile
    ? {
        id: c.studentProfile.id,
        rollNumber: c.studentProfile.rollNumber,
        firstName: c.studentProfile.firstName,
        lastName: c.studentProfile.lastName,
        department: c.studentProfile.department,
        studentType: c.studentProfile.studentType,
      }
    : undefined,
});

// ----------------------------------------------------
// STUDENT COMPLAINT OPERATIONS
// ----------------------------------------------------

export const createComplaint = async (userId: string, input: CreateComplaintInput) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found for authenticated user.', HTTP_STATUS.NOT_FOUND);
  }

  const complaint = await prisma.complaint.create({
    data: {
      studentProfileId: student.id,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: ComplaintStatus.SUBMITTED, // Persisted as SUBMITTED (PENDING)
    },
    include: {
      studentProfile: true,
    },
  });

  return formatComplaint(complaint);
};

export const getMyComplaints = async (userId: string, query: QueryComplaintsInput) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found for authenticated user.', HTTP_STATUS.NOT_FOUND);
  }

  const where: any = {
    studentProfileId: student.id,
  };

  if (query.status) {
    where.status = mapApiStatusToDb(query.status);
  }
  if (query.category) {
    where.category = query.category;
  }

  const [total, complaints] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    complaints: complaints.map(formatComplaint),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getMyComplaintById = async (userId: string, complaintId: string) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found for authenticated user.', HTTP_STATUS.NOT_FOUND);
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
  });

  if (!complaint) {
    throw new AppError('Complaint not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Strict ownership enforcement
  if (complaint.studentProfileId !== student.id) {
    throw new AppError('You do not have permission to view this complaint.', HTTP_STATUS.FORBIDDEN);
  }

  return formatComplaint(complaint);
};

// ----------------------------------------------------
// WARDEN COMPLAINT OPERATIONS
// ----------------------------------------------------

export const getAllComplaints = async (query: QueryComplaintsInput) => {
  const where: any = {};

  if (query.status) {
    where.status = mapApiStatusToDb(query.status);
  }
  if (query.category) {
    where.category = query.category;
  }

  const [total, complaints] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
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
            department: true,
            studentType: true,
          },
        },
      },
    }),
  ]);

  return {
    complaints: complaints.map(formatComplaint),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getComplaintById = async (complaintId: string) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
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

  if (!complaint) {
    throw new AppError('Complaint not found.', HTTP_STATUS.NOT_FOUND);
  }

  return formatComplaint(complaint);
};

export const resolveComplaint = async (
  wardenUserId: string,
  complaintId: string,
  input: ResolveComplaintInput
) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      studentProfile: {
        include: { user: true },
      },
    },
  });

  if (!complaint) {
    throw new AppError('Complaint not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Strictly enforce PENDING -> SOLVED only. Solved complaints cannot be reopened.
  if (complaint.status === ComplaintStatus.RESOLVED) {
    throw new AppError('Complaint is already solved and cannot be modified or reopened.', HTTP_STATUS.BAD_REQUEST);
  }

  const resolvedAt = new Date();
  const updatedComplaint = await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      status: ComplaintStatus.RESOLVED,
      resolutionNotes: input.resolutionNotes || null,
      resolvedAt,
    },
    include: {
      studentProfile: true,
    },
  });

  // Notify student via in-app notification
  if (complaint.studentProfile?.userId) {
    await prisma.notification.create({
      data: {
        userId: complaint.studentProfile.userId,
        type: NotificationType.COMPLAINT,
        title: 'Complaint Solved',
        message: `Your complaint "${complaint.title}" has been marked as solved.${
          input.resolutionNotes ? ` Resolution: ${input.resolutionNotes}` : ''
        }`,
        data: JSON.stringify({ complaintId: complaint.id, status: 'SOLVED' }),
      },
    });
  }

  // Audit log for Warden action
  await prisma.auditLog.create({
    data: {
      userId: wardenUserId,
      action: 'COMPLAINT_RESOLVED',
      entityType: 'Complaint',
      entityId: complaint.id,
      details: JSON.stringify({
        title: complaint.title,
        studentRollNumber: complaint.studentProfile.rollNumber,
        resolutionNotes: input.resolutionNotes || null,
      }),
    },
  });

  return formatComplaint(updatedComplaint);
};
