import { prisma } from '../config/db';
import { CreateBedInput, UpdateBedInput } from '../validators/hostelValidation';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';

export const createBed = async (adminUserId: string, data: CreateBedInput) => {
  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
    include: {
      beds: true,
      floor: { select: { floorName: true, hostel: { select: { name: true } } } },
    },
  });
  if (!room) {
    throw new AppError('Room not found.', HTTP_STATUS.NOT_FOUND);
  }

  // Count existing active physical beds
  const activeBedsCount = room.beds.filter((b) => b.isActive).length;
  if (activeBedsCount >= room.capacity) {
    throw new AppError(
      `Cannot add bed '${data.bedLabel}'. Room ${room.roomNumber} has reached its capacity limit of ${room.capacity} active beds.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const existingBedLabel = await prisma.bed.findUnique({
    where: {
      roomId_bedLabel: {
        roomId: data.roomId,
        bedLabel: data.bedLabel,
      },
    },
  });
  if (existingBedLabel) {
    throw new AppError(
      `Bed '${data.bedLabel}' already exists in Room ${room.roomNumber}.`,
      HTTP_STATUS.CONFLICT
    );
  }

  const bed = await prisma.bed.create({
    data: {
      roomId: data.roomId,
      bedLabel: data.bedLabel,
      isActive: data.isActive ?? true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'BED_CREATED',
      entityType: 'Bed',
      entityId: bed.id,
      details: JSON.stringify({ roomId: data.roomId, bedLabel: data.bedLabel }),
    },
  });

  return bed;
};

export const getBedsByRoom = async (roomId: string) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
  });
  if (!room) {
    throw new AppError('Room not found.', HTTP_STATUS.NOT_FOUND);
  }

  const beds = await prisma.bed.findMany({
    where: { roomId },
    include: {
      allocations: {
        where: { isActive: true },
        include: {
          studentProfile: {
            select: {
              id: true,
              rollNumber: true,
              firstName: true,
              lastName: true,
              phone: true,
              department: true,
              yearOfStudy: true,
            },
          },
        },
      },
    },
    orderBy: { bedLabel: 'asc' },
  });

  return beds.map((bed) => {
    const activeAlloc = bed.allocations[0];
    return {
      id: bed.id,
      roomId: bed.roomId,
      bedLabel: bed.bedLabel,
      isActive: bed.isActive, // physical availability
      isOccupied: Boolean(activeAlloc), // occupancy
      student: activeAlloc ? activeAlloc.studentProfile : null,
      allocationId: activeAlloc ? activeAlloc.id : null,
      allocatedFrom: activeAlloc ? activeAlloc.allocatedFrom : null,
    };
  });
};

export const getAvailableBeds = async (filters?: {
  hostelId?: string;
  roomId?: string;
}) => {
  const where: any = {
    isActive: true, // physically usable
  };

  if (filters?.roomId) {
    where.roomId = filters.roomId;
  } else if (filters?.hostelId) {
    where.room = {
      floor: {
        hostelId: filters.hostelId,
      },
    };
  }

  const beds = await prisma.bed.findMany({
    where,
    include: {
      room: {
        select: {
          id: true,
          roomNumber: true,
          roomType: true,
          capacity: true,
          occupancy: true,
          isActive: true,
          floor: {
            select: {
              id: true,
              floorNumber: true,
              floorName: true,
              hostel: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      },
      allocations: {
        where: { isActive: true },
        select: { id: true },
      },
    },
    orderBy: [{ room: { roomNumber: 'asc' } }, { bedLabel: 'asc' }],
  });

  // Filter out beds that have an active allocation or belong to inactive rooms
  const availableBeds = beds
    .filter((b) => b.room.isActive && b.allocations.length === 0)
    .map((b) => ({
      id: b.id,
      bedLabel: b.bedLabel,
      isActive: b.isActive,
      room: {
        id: b.room.id,
        roomNumber: b.room.roomNumber,
        roomType: b.room.roomType,
        floor: b.room.floor,
      },
    }));

  return availableBeds;
};

export const getOccupiedBeds = async (filters?: {
  hostelId?: string;
  roomId?: string;
}) => {
  const where: any = {
    allocations: {
      some: { isActive: true },
    },
  };

  if (filters?.roomId) {
    where.roomId = filters.roomId;
  } else if (filters?.hostelId) {
    where.room = {
      floor: {
        hostelId: filters.hostelId,
      },
    };
  }

  const beds = await prisma.bed.findMany({
    where,
    include: {
      room: {
        select: {
          id: true,
          roomNumber: true,
          roomType: true,
          floor: {
            select: {
              floorName: true,
              hostel: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      },
      allocations: {
        where: { isActive: true },
        include: {
          studentProfile: {
            select: {
              id: true,
              rollNumber: true,
              firstName: true,
              lastName: true,
              phone: true,
              department: true,
            },
          },
        },
      },
    },
    orderBy: [{ room: { roomNumber: 'asc' } }, { bedLabel: 'asc' }],
  });

  return beds.map((b) => {
    const alloc = b.allocations[0];
    return {
      id: b.id,
      bedLabel: b.bedLabel,
      isActive: b.isActive,
      room: b.room,
      allocationId: alloc?.id,
      allocatedFrom: alloc?.allocatedFrom,
      student: alloc?.studentProfile,
    };
  });
};

export const updateBed = async (
  adminUserId: string,
  bedId: string,
  data: UpdateBedInput
) => {
  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    include: {
      allocations: { where: { isActive: true } },
    },
  });
  if (!bed) {
    throw new AppError('Bed not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (data.isActive === false && bed.allocations.length > 0) {
    throw new AppError(
      'Cannot mark bed inactive while it currently has an active student allocation. Vacate or transfer the student first.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (data.bedLabel && data.bedLabel !== bed.bedLabel) {
    const duplicate = await prisma.bed.findUnique({
      where: {
        roomId_bedLabel: {
          roomId: bed.roomId,
          bedLabel: data.bedLabel,
        },
      },
    });
    if (duplicate) {
      throw new AppError(
        `Bed label '${data.bedLabel}' already exists in this room.`,
        HTTP_STATUS.CONFLICT
      );
    }
  }

  const updated = await prisma.bed.update({
    where: { id: bedId },
    data: {
      ...(data.bedLabel && { bedLabel: data.bedLabel }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'BED_UPDATED',
      entityType: 'Bed',
      entityId: bedId,
      details: JSON.stringify(data),
    },
  });

  return updated;
};
