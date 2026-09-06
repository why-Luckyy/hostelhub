import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import { LeaveStatus, StudentType, NotificationType, UserRole } from '@prisma/client';
import {
  CreateLeaveRequestInput,
  ReviewLeaveRequestInput,
  QueryLeaveRequestsInput,
} from '../validators/leaveValidation';

export const createLeaveRequest = async (userId: string, input: CreateLeaveRequestInput) => {
  // 1. Resolve student profile from authenticated userId
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found for authenticated user.', HTTP_STATUS.NOT_FOUND);
  }

  // 2. DAY SCHOLAR RULE:
  // DAY_SCHOLAR normally has no hostel residency eligibility.
  // If authorized temporarily (active bed allocation), they may apply; otherwise rejected with 400.
  if (student.studentType === StudentType.DAY_SCHOLAR) {
    const activeBedAllocation = await prisma.bedAllocation.findFirst({
      where: {
        studentProfileId: student.id,
        isActive: true,
      },
    });

    if (!activeBedAllocation && !student.isAllocated) {
      throw new AppError(
        'Day Scholar students without valid temporary hostel residential authorization cannot submit hostel gate-pass requests.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  // 3. Check for overlapping pending or approved leave requests for the same student
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      studentProfileId: student.id,
      status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      AND: [
        { startDate: { lt: endDate } },
        { endDate: { gt: startDate } },
      ],
    },
  });

  if (overlapping) {
    throw new AppError(
      'You already have an active or pending leave request overlapping with the selected dates.',
      HTTP_STATUS.CONFLICT
    );
  }

  // 4. Create LeaveRequest
  const leave = await prisma.leaveRequest.create({
    data: {
      studentProfileId: student.id,
      startDate,
      endDate,
      destination: input.destination,
      emergencyContact: input.emergencyContact,
      reason: input.reason,
      status: LeaveStatus.PENDING,
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

  // 5. Audit Log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'LEAVE_REQUEST_CREATED',
      entityType: 'LeaveRequest',
      entityId: leave.id,
      details: JSON.stringify({
        studentRollNumber: student.rollNumber,
        startDate: input.startDate,
        endDate: input.endDate,
        destination: input.destination,
      }),
    },
  });

  return leave;
};

export const getMyLeaveRequests = async (userId: string, query: QueryLeaveRequestsInput) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found.', HTTP_STATUS.NOT_FOUND);
  }

  const where: any = { studentProfileId: student.id };
  if (query.status) {
    where.status = query.status;
  }

  const [total, requests] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        reviewedBy: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    requests,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getLeaveRequestById = async (userId: string, userRole: UserRole, id: string) => {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      studentProfile: {
        select: {
          id: true,
          userId: true,
          rollNumber: true,
          firstName: true,
          lastName: true,
          studentType: true,
          phone: true,
          department: true,
          yearOfStudy: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!leave) {
    throw new AppError('Leave request not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Student can only view their own leave requests
  if (userRole === UserRole.STUDENT && leave.studentProfile.userId !== userId) {
    throw new AppError('Access denied: You can only view your own leave requests.', HTTP_STATUS.FORBIDDEN);
  }

  return leave;
};

export const cancelLeaveRequest = async (userId: string, id: string) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found.', HTTP_STATUS.NOT_FOUND);
  }

  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
  });

  if (!leave) {
    throw new AppError('Leave request not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (leave.studentProfileId !== student.id) {
    throw new AppError('Access denied: You can only cancel your own leave requests.', HTTP_STATUS.FORBIDDEN);
  }

  if (leave.status !== LeaveStatus.PENDING) {
    throw new AppError(
      `Only PENDING leave requests can be cancelled. Current status is ${leave.status}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: LeaveStatus.CANCELLED },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'LEAVE_REQUEST_CANCELLED',
      entityType: 'LeaveRequest',
      entityId: id,
      details: JSON.stringify({
        studentRollNumber: student.rollNumber,
        previousStatus: leave.status,
      }),
    },
  });

  return updated;
};

export const getAllLeaveRequests = async (query: QueryLeaveRequestsInput) => {
  const where: any = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.studentProfileId) {
    where.studentProfileId = query.studentProfileId;
  }

  const [total, requests] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
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
            phone: true,
            department: true,
            yearOfStudy: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    requests,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const reviewLeaveRequest = async (
  wardenUserId: string,
  id: string,
  input: ReviewLeaveRequestInput
) => {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      studentProfile: {
        select: {
          id: true,
          userId: true,
          rollNumber: true,
        },
      },
    },
  });

  if (!leave) {
    throw new AppError('Leave request not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (leave.status !== LeaveStatus.PENDING) {
    throw new AppError(
      `Cannot review this request. Current status is already ${leave.status}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: input.status,
      reviewedByAdminId: wardenUserId,
      reviewedAt: new Date(),
      remarks: input.remarks || null,
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
      reviewedBy: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // Create in-app notification for the student
  await prisma.notification.create({
    data: {
      userId: leave.studentProfile.userId,
      type: NotificationType.LEAVE,
      title: input.status === LeaveStatus.APPROVED ? 'Gate Pass / Leave Approved' : 'Gate Pass / Leave Rejected',
      message: `Your leave request for ${leave.destination} has been ${input.status.toLowerCase()}.${input.remarks ? ` Remarks: ${input.remarks}` : ''}`,
      data: JSON.stringify({ leaveRequestId: leave.id, status: input.status }),
    },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      userId: wardenUserId,
      action: input.status === LeaveStatus.APPROVED ? 'LEAVE_REQUEST_APPROVED' : 'LEAVE_REQUEST_REJECTED',
      entityType: 'LeaveRequest',
      entityId: id,
      details: JSON.stringify({
        studentRollNumber: leave.studentProfile.rollNumber,
        status: input.status,
        remarks: input.remarks,
      }),
    },
  });

  return updated;
};
