import { prisma } from '../config/db';
import {
  AllocateBedInput,
  VacateBedInput,
  TransferBedInput,
} from '../validators/hostelValidation';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import { StudentType } from '@prisma/client';
import { Prisma } from '@prisma/client';

export const allocateBed = async (adminUserId: string, data: AllocateBedInput) => {
  // 1. Verify target bed and room availability
  const bed = await prisma.bed.findUnique({
    where: { id: data.bedId },
    include: {
      room: {
        include: {
          floor: { include: { hostel: true } },
        },
      },
      allocations: {
        where: { isActive: true },
        include: { studentProfile: { select: { rollNumber: true } } },
      },
    },
  });

  if (!bed) {
    throw new AppError('Bed not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (!bed.isActive) {
    throw new AppError(
      `Bed '${bed.bedLabel}' is currently marked physically inactive/maintenance and cannot be allocated.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (!bed.room.isActive) {
    throw new AppError(
      `Room '${bed.room.roomNumber}' is currently marked inactive and cannot receive allocations.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (bed.allocations.length > 0) {
    const activeStudent = bed.allocations[0].studentProfile;
    throw new AppError(
      `Bed '${bed.bedLabel}' in Room ${bed.room.roomNumber} is already occupied by student ${activeStudent.rollNumber}.`,
      HTTP_STATUS.CONFLICT
    );
  }

  if (bed.room.occupancy >= bed.room.capacity) {
    throw new AppError(
      `Room ${bed.room.roomNumber} has reached its maximum occupancy capacity (${bed.room.capacity}).`,
      HTTP_STATUS.CONFLICT
    );
  }

  // 2. Verify student profile and eligibility
  const student = await prisma.studentProfile.findUnique({
    where: { id: data.studentProfileId },
    include: {
      bedAllocations: { where: { isActive: true }, include: { room: true } },
    },
  });

  if (!student) {
    throw new AppError('Student profile not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Server-side Student Eligibility Check: Only HOSTELERs can receive hostel beds
  if (student.studentType !== StudentType.HOSTELER) {
    throw new AppError(
      'Only students with HOSTELER status are eligible for hostel bed allocation. Day scholars cannot receive a hostel bed.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Check if student already has an active allocation
  if (student.bedAllocations.length > 0 || student.isAllocated) {
    const existing = student.bedAllocations[0];
    throw new AppError(
      `Student already has an active bed allocation (${existing?.room?.roomNumber || 'Room'} - ${existing?.bedLabel || 'Bed'}). A student can only have one active allocation.`,
      HTTP_STATUS.CONFLICT
    );
  }

  // 3. Interactive Transaction: Allocate bed, update room occupancy, update student flag, write audit log
  try {
    const allocation = await prisma.$transaction(
      async (tx) => {
        // Create active allocation
        const newAllocation = await tx.bedAllocation.create({
          data: {
            studentProfileId: student.id,
            bedId: bed.id,
            roomId: bed.roomId,
            bedLabel: bed.bedLabel,
            isActive: true,
            allocatedFrom: new Date(),
            allocatedByAdminId: adminUserId,
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
            bed: { select: { id: true, bedLabel: true } },
            room: {
              select: {
                id: true,
                roomNumber: true,
                floor: {
                  select: {
                    floorName: true,
                    hostel: { select: { name: true, code: true } },
                  },
                },
              },
            },
          },
        });

        // Sequential transactional updates (Prisma interactive transactions require sequential execution)
        await tx.room.update({
          where: { id: bed.roomId },
          data: { occupancy: { increment: 1 } },
        });

        await tx.studentProfile.update({
          where: { id: student.id },
          data: { isAllocated: true },
        });

        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'BED_ALLOCATED',
            entityType: 'BedAllocation',
            entityId: newAllocation.id,
            details: JSON.stringify({
              studentRollNumber: student.rollNumber,
              studentProfileId: student.id,
              bedId: bed.id,
              bedLabel: bed.bedLabel,
              roomId: bed.roomId,
              roomNumber: bed.room.roomNumber,
            }),
          },
        });

        return newAllocation;
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    return allocation;
  } catch (error: any) {
    // Catch PostgreSQL partial unique index violations (concurrency race condition)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(
        'Concurrency conflict: The bed or student was allocated concurrently by another transaction.',
        HTTP_STATUS.CONFLICT
      );
    }
    throw error;
  }
};

export const vacateBed = async (adminUserId: string, data: VacateBedInput) => {
  // Locate active allocation
  const where: any = { isActive: true };
  if (data.allocationId) {
    where.id = data.allocationId;
  } else if (data.studentProfileId) {
    where.studentProfileId = data.studentProfileId;
  }

  const allocation = await prisma.bedAllocation.findFirst({
    where,
    include: {
      room: true,
      bed: true,
      studentProfile: true,
    },
  });

  if (!allocation) {
    throw new AppError(
      'No active bed allocation found for the specified student or allocation ID.',
      HTTP_STATUS.NOT_FOUND
    );
  }

  // Atomic transaction: Deactivate allocation, decrement room occupancy, set student isAllocated to false, write audit log
  const vacated = await prisma.$transaction(async (tx) => {
    // 1. Mark allocation inactive and set vacated timestamp (preserving history)
    const updatedAllocation = await tx.bedAllocation.update({
      where: { id: allocation.id },
      data: {
        isActive: false,
        allocatedTo: new Date(),
      },
    });

    // 2. Decrement room occupancy transactionally (never below 0)
    const currentRoom = await tx.room.findUnique({ where: { id: allocation.roomId } });
    const newOccupancy = Math.max(0, (currentRoom?.occupancy || 1) - 1);
    await tx.room.update({
      where: { id: allocation.roomId },
      data: { occupancy: newOccupancy },
    });

    // 3. Mark student isAllocated to false
    await tx.studentProfile.update({
      where: { id: allocation.studentProfileId },
      data: { isAllocated: false },
    });

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'BED_VACATED',
        entityType: 'BedAllocation',
        entityId: allocation.id,
        details: JSON.stringify({
          studentRollNumber: allocation.studentProfile.rollNumber,
          bedLabel: allocation.bedLabel,
          roomNumber: allocation.room.roomNumber,
        }),
      },
    });

    return updatedAllocation;
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  return {
    success: true,
    message: `Bed ${allocation.bedLabel} in Room ${allocation.room.roomNumber} vacated successfully. Student ${allocation.studentProfile.rollNumber} is now unallocated.`,
    vacatedAllocation: vacated,
  };
};

export const transferBed = async (adminUserId: string, data: TransferBedInput) => {
  // 1. Verify student and find their current active allocation
  const student = await prisma.studentProfile.findUnique({
    where: { id: data.studentProfileId },
    include: {
      bedAllocations: { where: { isActive: true }, include: { room: true } },
    },
  });

  if (!student) {
    throw new AppError('Student profile not found.', HTTP_STATUS.NOT_FOUND);
  }

  const currentAllocation = student.bedAllocations[0];
  if (!currentAllocation) {
    throw new AppError(
      'Student does not currently have an active bed allocation to transfer from.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (currentAllocation.bedId === data.targetBedId) {
    throw new AppError(
      'Target bed is the same as the student’s current bed.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // 2. Verify target bed availability
  const targetBed = await prisma.bed.findUnique({
    where: { id: data.targetBedId },
    include: {
      room: {
        include: {
          floor: { include: { hostel: true } },
        },
      },
      allocations: {
        where: { isActive: true },
        include: { studentProfile: { select: { rollNumber: true } } },
      },
    },
  });

  if (!targetBed) {
    throw new AppError('Target bed not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (!targetBed.isActive) {
    throw new AppError('Target bed is marked physically inactive/maintenance.', HTTP_STATUS.BAD_REQUEST);
  }

  if (!targetBed.room.isActive) {
    throw new AppError('Target room is marked inactive.', HTTP_STATUS.BAD_REQUEST);
  }

  if (targetBed.allocations.length > 0) {
    throw new AppError(
      `Target bed '${targetBed.bedLabel}' is already occupied by student ${targetBed.allocations[0].studentProfile.rollNumber}.`,
      HTTP_STATUS.CONFLICT
    );
  }

  const isDifferentRoom = currentAllocation.roomId !== targetBed.roomId;
  if (isDifferentRoom && targetBed.room.occupancy >= targetBed.room.capacity) {
    throw new AppError(
      `Target Room ${targetBed.room.roomNumber} has reached its maximum capacity.`,
      HTTP_STATUS.CONFLICT
    );
  }

  // 3. Atomic Transaction: Deactivate old allocation, create new allocation, update room occupancies, log audit
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deactivate old allocation
      await tx.bedAllocation.update({
        where: { id: currentAllocation.id },
        data: {
          isActive: false,
          allocatedTo: new Date(),
        },
      });

      // 2. If transfer is to a different room, adjust both room occupancies
      if (isDifferentRoom) {
        const oldRoom = await tx.room.findUnique({ where: { id: currentAllocation.roomId } });
        const newOldOccupancy = Math.max(0, (oldRoom?.occupancy || 1) - 1);
        await tx.room.update({
          where: { id: currentAllocation.roomId },
          data: { occupancy: newOldOccupancy },
        });

        await tx.room.update({
          where: { id: targetBed.roomId },
          data: { occupancy: { increment: 1 } },
        });
      }

      // 3. Create new active allocation for target bed
      const newAllocation = await tx.bedAllocation.create({
        data: {
          studentProfileId: student.id,
          bedId: targetBed.id,
          roomId: targetBed.roomId,
          bedLabel: targetBed.bedLabel,
          isActive: true,
          allocatedFrom: new Date(),
          allocatedByAdminId: adminUserId,
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
          bed: { select: { id: true, bedLabel: true } },
          room: {
            select: {
              id: true,
              roomNumber: true,
              floor: {
                select: {
                  floorName: true,
                  hostel: { select: { name: true, code: true } },
                },
              },
            },
          },
        },
      });

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'BED_TRANSFERRED',
          entityType: 'BedAllocation',
          entityId: newAllocation.id,
          details: JSON.stringify({
            studentRollNumber: student.rollNumber,
            fromRoomId: currentAllocation.roomId,
            fromBedLabel: currentAllocation.bedLabel,
            toRoomId: targetBed.roomId,
            toRoomNumber: targetBed.room.roomNumber,
            toBedLabel: targetBed.bedLabel,
          }),
        },
      });

      return newAllocation;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    return {
      success: true,
      message: `Student ${student.rollNumber} transferred successfully to Room ${targetBed.room.roomNumber} (${targetBed.bedLabel}).`,
      allocation: result,
    };
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(
        'Concurrency conflict: Target bed was allocated concurrently by another transaction.',
        HTTP_STATUS.CONFLICT
      );
    }
    throw error;
  }
};

export const getMyAllocation = async (studentUserId: string) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId },
  });

  if (!student) {
    throw new AppError('Student profile not found for authenticated user.', HTTP_STATUS.NOT_FOUND);
  }

  const activeAllocation = await prisma.bedAllocation.findFirst({
    where: {
      studentProfileId: student.id,
      isActive: true,
    },
    include: {
      bed: true,
      room: {
        include: {
          floor: {
            include: {
              hostel: true,
            },
          },
        },
      },
    },
  });

  if (!activeAllocation) {
    return {
      isAllocated: false,
      message: 'No hostel bed currently assigned.',
      student: {
        id: student.id,
        rollNumber: student.rollNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        studentType: student.studentType,
      },
      allocation: null,
    };
  }

  return {
    isAllocated: true,
    message: 'Active hostel allocation retrieved.',
    student: {
      id: student.id,
      rollNumber: student.rollNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      studentType: student.studentType,
    },
    allocation: {
      id: activeAllocation.id,
      bedId: activeAllocation.bedId,
      bedLabel: activeAllocation.bedLabel,
      allocatedFrom: activeAllocation.allocatedFrom,
      room: {
        id: activeAllocation.room.id,
        roomNumber: activeAllocation.room.roomNumber,
        roomType: activeAllocation.room.roomType,
        floor: {
          id: activeAllocation.room.floor.id,
          floorNumber: activeAllocation.room.floor.floorNumber,
          floorName: activeAllocation.room.floor.floorName,
          hostel: {
            id: activeAllocation.room.floor.hostel.id,
            name: activeAllocation.room.floor.hostel.name,
            code: activeAllocation.room.floor.hostel.code,
          },
        },
      },
    },
  };
};

export const getAllocations = async (filters?: {
  isActive?: boolean;
  studentProfileId?: string;
  roomId?: string;
  hostelId?: string;
}) => {
  const where: any = {};
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;
  if (filters?.studentProfileId) where.studentProfileId = filters.studentProfileId;
  if (filters?.roomId) where.roomId = filters.roomId;
  if (filters?.hostelId) {
    where.room = {
      floor: {
        hostelId: filters.hostelId,
      },
    };
  }

  const allocations = await prisma.bedAllocation.findMany({
    where,
    include: {
      studentProfile: {
        select: {
          id: true,
          rollNumber: true,
          firstName: true,
          lastName: true,
          phone: true,
          studentType: true,
          department: true,
        },
      },
      bed: { select: { id: true, bedLabel: true } },
      room: {
        select: {
          id: true,
          roomNumber: true,
          floor: {
            select: {
              floorName: true,
              hostel: { select: { name: true, code: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return allocations;
};
