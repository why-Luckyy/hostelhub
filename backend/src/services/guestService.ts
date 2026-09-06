import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import { GuestStatus, NotificationType, UserRole } from '@prisma/client';
import {
  CreateGuestRequestInput,
  ReviewGuestRequestInput,
  QueryGuestRequestsInput,
  QueryGuestPassesInput,
} from '../validators/guestValidation';

// Cryptographically secure pass code generator
export const generateSecurePassCode = (visitDate: Date): string => {
  const y = visitDate.getFullYear();
  const m = String(visitDate.getMonth() + 1).padStart(2, '0');
  const d = String(visitDate.getDate()).padStart(2, '0');
  // 4 uppercase hex characters generated via cryptographically secure random bytes
  const secureRandomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `GP-${y}${m}${d}-${secureRandomHex}`;
};

export const createGuestRequest = async (userId: string, input: CreateGuestRequestInput) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found for authenticated user.', HTTP_STATUS.NOT_FOUND);
  }

  // Parse YYYY-MM-DD to UTC date
  const [year, month, day] = input.visitDate.split('-').map(Number);
  const visitDate = new Date(Date.UTC(year, month - 1, day));

  const guestRequest = await prisma.guestRequest.create({
    data: {
      hostStudentProfileId: student.id,
      guestName: input.guestName,
      relationship: input.relationship,
      visitDate,
      requestedMeal: input.requestedMeal,
      numberOfGuests: input.numberOfGuests,
      reason: input.reason,
      status: GuestStatus.PENDING,
    },
    include: {
      hostStudent: {
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

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'GUEST_REQUEST_CREATED',
      entityType: 'GuestRequest',
      entityId: guestRequest.id,
      details: JSON.stringify({
        studentRollNumber: student.rollNumber,
        guestName: input.guestName,
        visitDate: input.visitDate,
        numberOfGuests: input.numberOfGuests,
      }),
    },
  });

  return guestRequest;
};

export const getMyGuestRequests = async (userId: string, query: QueryGuestRequestsInput) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found.', HTTP_STATUS.NOT_FOUND);
  }

  const where: any = { hostStudentProfileId: student.id };
  if (query.status) {
    where.status = query.status;
  }

  const [total, requests] = await Promise.all([
    prisma.guestRequest.count({ where }),
    prisma.guestRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        guestPass: true,
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

export const getGuestRequestById = async (userId: string, userRole: UserRole, id: string) => {
  const request = await prisma.guestRequest.findUnique({
    where: { id },
    include: {
      hostStudent: {
        select: {
          id: true,
          userId: true,
          rollNumber: true,
          firstName: true,
          lastName: true,
          phone: true,
          department: true,
        },
      },
      guestPass: true,
      reviewedBy: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!request) {
    throw new AppError('Guest request not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (userRole === UserRole.STUDENT && request.hostStudent.userId !== userId) {
    throw new AppError('Access denied: You can only view your own guest requests.', HTTP_STATUS.FORBIDDEN);
  }

  return request;
};

export const getAllGuestRequests = async (query: QueryGuestRequestsInput) => {
  const where: any = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.hostStudentProfileId) {
    where.hostStudentProfileId = query.hostStudentProfileId;
  }

  const [total, requests] = await Promise.all([
    prisma.guestRequest.count({ where }),
    prisma.guestRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        hostStudent: {
          select: {
            id: true,
            rollNumber: true,
            firstName: true,
            lastName: true,
            studentType: true,
            phone: true,
            department: true,
          },
        },
        guestPass: true,
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

export const reviewGuestRequest = async (
  wardenUserId: string,
  id: string,
  input: ReviewGuestRequestInput
) => {
  const guestRequest = await prisma.guestRequest.findUnique({
    where: { id },
    include: {
      hostStudent: {
        select: {
          id: true,
          userId: true,
          rollNumber: true,
        },
      },
      guestPass: true,
    },
  });

  if (!guestRequest) {
    throw new AppError('Guest request not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (guestRequest.status !== GuestStatus.PENDING) {
    throw new AppError(
      `Cannot review this guest request. Current status is already ${guestRequest.status}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (input.status === GuestStatus.APPROVED) {
    // Cryptographically secure collision retry loop (up to 5 attempts)
    let uniquePassCode = '';
    let isUnique = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateCode = generateSecurePassCode(new Date(guestRequest.visitDate));
      const existing = await prisma.guestPass.findUnique({
        where: { passCode: candidateCode },
      });
      if (!existing) {
        uniquePassCode = candidateCode;
        isUnique = true;
        break;
      }
    }

    if (!isUnique || !uniquePassCode) {
      throw new AppError('Failed to generate unique guest pass code. Please try again.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Atomic transaction: Update GuestRequest and create GuestPass sequentially
    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.guestRequest.update({
        where: { id },
        data: {
          status: GuestStatus.APPROVED,
          passNumber: uniquePassCode,
          reviewedByAdminId: wardenUserId,
          reviewedAt: new Date(),
          remarks: input.remarks || null,
        },
      });

      const pass = await tx.guestPass.create({
        data: {
          guestRequestId: id,
          passCode: uniquePassCode,
          validOn: guestRequest.visitDate,
          isVerifiedAtGate: false,
        },
      });

      await tx.notification.create({
        data: {
          userId: guestRequest.hostStudent.userId,
          type: NotificationType.GUEST,
          title: 'Guest Request Approved — Pass Issued',
          message: `Your guest request for ${guestRequest.guestName} on ${new Date(guestRequest.visitDate).toISOString().split('T')[0]} has been approved! Pass Code: ${uniquePassCode}`,
          data: JSON.stringify({ guestRequestId: id, passCode: uniquePassCode, passId: pass.id }),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: wardenUserId,
          action: 'GUEST_REQUEST_APPROVED',
          entityType: 'GuestRequest',
          entityId: id,
          details: JSON.stringify({
            studentRollNumber: guestRequest.hostStudent.rollNumber,
            guestName: guestRequest.guestName,
            passCode: uniquePassCode,
            remarks: input.remarks,
          }),
        },
      });

      return { request: updatedRequest, pass };
    });

    return result;
  } else {
    // Reject request (no GuestPass created)
    const updatedRequest = await prisma.guestRequest.update({
      where: { id },
      data: {
        status: GuestStatus.REJECTED,
        passNumber: null,
        reviewedByAdminId: wardenUserId,
        reviewedAt: new Date(),
        remarks: input.remarks || null,
      },
    });

    await prisma.notification.create({
      data: {
        userId: guestRequest.hostStudent.userId,
        type: NotificationType.GUEST,
        title: 'Guest Request Rejected',
        message: `Your guest request for ${guestRequest.guestName} on ${new Date(guestRequest.visitDate).toISOString().split('T')[0]} was rejected.${input.remarks ? ` Remarks: ${input.remarks}` : ''}`,
        data: JSON.stringify({ guestRequestId: id, status: GuestStatus.REJECTED }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: wardenUserId,
        action: 'GUEST_REQUEST_REJECTED',
        entityType: 'GuestRequest',
        entityId: id,
        details: JSON.stringify({
          studentRollNumber: guestRequest.hostStudent.rollNumber,
          guestName: guestRequest.guestName,
          remarks: input.remarks,
        }),
      },
    });

    return { request: updatedRequest, pass: null };
  }
};

export const getMyGuestPasses = async (userId: string, query: QueryGuestPassesInput) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!student) {
    throw new AppError('Student profile not found.', HTTP_STATUS.NOT_FOUND);
  }

  const where: any = {
    guestRequest: {
      hostStudentProfileId: student.id,
    },
  };

  if (query.isVerified !== undefined) {
    where.isVerifiedAtGate = query.isVerified;
  }

  const [total, passes] = await Promise.all([
    prisma.guestPass.count({ where }),
    prisma.guestPass.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        guestRequest: {
          select: {
            id: true,
            guestName: true,
            relationship: true,
            numberOfGuests: true,
            requestedMeal: true,
            reason: true,
            status: true,
            passNumber: true,
            visitDate: true,
          },
        },
      },
    }),
  ]);

  return {
    passes,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getGuestPassById = async (userId: string, userRole: UserRole, id: string) => {
  const pass = await prisma.guestPass.findUnique({
    where: { id },
    include: {
      guestRequest: {
        include: {
          hostStudent: {
            select: {
              id: true,
              userId: true,
              rollNumber: true,
              firstName: true,
              lastName: true,
              phone: true,
              department: true,
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
      },
    },
  });

  if (!pass) {
    throw new AppError('Guest pass not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (userRole === UserRole.STUDENT && pass.guestRequest.hostStudent.userId !== userId) {
    throw new AppError('Access denied: You can only view your own guest passes.', HTTP_STATUS.FORBIDDEN);
  }

  return pass;
};

export const getAllGuestPasses = async (query: QueryGuestPassesInput) => {
  const where: any = {};
  if (query.isVerified !== undefined) {
    where.isVerifiedAtGate = query.isVerified;
  }

  const [total, passes] = await Promise.all([
    prisma.guestPass.count({ where }),
    prisma.guestPass.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        guestRequest: {
          include: {
            hostStudent: {
              select: {
                id: true,
                rollNumber: true,
                firstName: true,
                lastName: true,
                studentType: true,
                phone: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    passes,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};
