import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import { FineStatus, NotificationType } from '@prisma/client';
import {
  CreateFineInput,
  UpdateFineStatusInput,
  QueryFinesInput,
} from '../validators/fineValidation';

export const assignFine = async (wardenUserId: string, input: CreateFineInput) => {
  const student = await prisma.studentProfile.findUnique({
    where: { id: input.studentProfileId },
    include: { user: true },
  });

  if (!student) {
    throw new AppError('Target student profile not found.', HTTP_STATUS.NOT_FOUND);
  }

  const fine = await prisma.fine.create({
    data: {
      studentProfileId: student.id,
      amount: input.amount,
      reason: input.reason,
      status: FineStatus.UNPAID,
      assignedByAdminId: wardenUserId,
    },
    include: {
      studentProfile: {
        select: {
          id: true,
          rollNumber: true,
          firstName: true,
          lastName: true,
          department: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // Notify student
  if (student.userId) {
    await prisma.notification.create({
      data: {
        userId: student.userId,
        type: NotificationType.SYSTEM,
        title: 'Disciplinary Fine Issued',
        message: `A fine of ₹${input.amount} has been assigned for: "${input.reason}". Status: UNPAID.`,
        data: JSON.stringify({ fineId: fine.id, amount: input.amount }),
      },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: wardenUserId,
      action: 'FINE_ASSIGNED',
      entityType: 'Fine',
      entityId: fine.id,
      details: JSON.stringify({
        studentRollNumber: student.rollNumber,
        amount: input.amount,
        reason: input.reason,
      }),
    },
  });

  return fine;
};

export const getMyFines = async (userId: string, query: QueryFinesInput) => {
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
    where.status = query.status;
  }

  const [total, fines] = await Promise.all([
    prisma.fine.count({ where }),
    prisma.fine.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        assignedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    fines,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getMyFineById = async (userId: string, fineId: string) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found for authenticated user.', HTTP_STATUS.NOT_FOUND);
  }

  const fine = await prisma.fine.findUnique({
    where: { id: fineId },
    include: {
      assignedBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!fine) {
    throw new AppError('Fine record not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Strict student ownership check
  if (fine.studentProfileId !== student.id) {
    throw new AppError('You do not have permission to view this fine.', HTTP_STATUS.FORBIDDEN);
  }

  return fine;
};

export const getAllFines = async (query: QueryFinesInput) => {
  const where: any = {};

  if (query.status) {
    where.status = query.status;
  }
  if (query.studentProfileId) {
    where.studentProfileId = query.studentProfileId;
  }

  const [total, fines] = await Promise.all([
    prisma.fine.count({ where }),
    prisma.fine.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
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
        assignedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    fines,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getFineById = async (fineId: string) => {
  const fine = await prisma.fine.findUnique({
    where: { id: fineId },
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
      assignedBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!fine) {
    throw new AppError('Fine record not found.', HTTP_STATUS.NOT_FOUND);
  }

  return fine;
};

export const updateFineStatus = async (
  wardenUserId: string,
  fineId: string,
  input: UpdateFineStatusInput
) => {
  const fine = await prisma.fine.findUnique({
    where: { id: fineId },
    include: {
      studentProfile: {
        include: { user: true },
      },
    },
  });

  if (!fine) {
    throw new AppError('Fine record not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (fine.status === FineStatus.PAID) {
    throw new AppError('Fine is already marked as PAID.', HTTP_STATUS.BAD_REQUEST);
  }

  const paidAt = new Date();
  const updatedFine = await prisma.fine.update({
    where: { id: fineId },
    data: {
      status: FineStatus.PAID,
      paidAt,
    },
    include: {
      studentProfile: {
        select: {
          id: true,
          rollNumber: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Notify student
  if (fine.studentProfile?.userId) {
    await prisma.notification.create({
      data: {
        userId: fine.studentProfile.userId,
        type: NotificationType.SYSTEM,
        title: 'Fine Payment Recorded',
        message: `Your fine of ₹${fine.amount} for "${fine.reason}" has been marked as PAID.`,
        data: JSON.stringify({ fineId: fine.id, status: 'PAID' }),
      },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: wardenUserId,
      action: 'FINE_STATUS_UPDATED',
      entityType: 'Fine',
      entityId: fine.id,
      details: JSON.stringify({
        studentRollNumber: fine.studentProfile.rollNumber,
        amount: fine.amount,
        status: FineStatus.PAID,
      }),
    },
  });

  return updatedFine;
};
