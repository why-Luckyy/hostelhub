import { prisma } from '../config/db';
import { CreateRoomInput, UpdateRoomInput } from '../validators/hostelValidation';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import { RoomType } from '@prisma/client';

export const createRoom = async (adminUserId: string, data: CreateRoomInput) => {
  const floor = await prisma.floor.findUnique({
    where: { id: data.floorId },
    include: { hostel: true },
  });
  if (!floor) {
    throw new AppError('Floor not found.', HTTP_STATUS.NOT_FOUND);
  }

  const existingRoom = await prisma.room.findUnique({
    where: {
      floorId_roomNumber: {
        floorId: data.floorId,
        roomNumber: data.roomNumber,
      },
    },
  });
  if (existingRoom) {
    throw new AppError(
      `Room '${data.roomNumber}' already exists on floor '${floor.floorName}'.`,
      HTTP_STATUS.CONFLICT
    );
  }

  // Atomic transaction: Create room and automatically create exactly N beds (Bed A, Bed B, ...)
  const room = await prisma.$transaction(async (tx) => {
    const newRoom = await tx.room.create({
      data: {
        floorId: data.floorId,
        roomNumber: data.roomNumber,
        capacity: data.capacity,
        occupancy: 0,
        roomType: data.roomType ?? RoomType.NON_AC,
        isActive: data.isActive ?? true,
      },
    });

    // Auto-generate exactly N beds: Bed A, Bed B, Bed C... sequentially
    for (let i = 1; i <= data.capacity; i++) {
      const letter = String.fromCharCode(64 + i); // 1 -> 'A', 2 -> 'B', ...
      const bedLabel = `Bed ${letter}`;
      await tx.bed.create({
        data: {
          roomId: newRoom.id,
          bedLabel,
          isActive: true,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ROOM_CREATED',
        entityType: 'Room',
        entityId: newRoom.id,
        details: JSON.stringify({
          roomNumber: data.roomNumber,
          capacity: data.capacity,
          bedsCreated: data.capacity,
        }),
      },
    });

    return tx.room.findUnique({
      where: { id: newRoom.id },
      include: {
        beds: { orderBy: { bedLabel: 'asc' } },
        floor: { select: { floorName: true, hostel: { select: { name: true } } } },
      },
    });
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  return room;
};

export const getRooms = async (filters?: {
  floorId?: string;
  hostelId?: string;
  roomType?: RoomType;
  isActive?: boolean;
  hasAvailableBeds?: boolean;
}) => {
  const where: any = {};
  if (filters?.floorId) where.floorId = filters.floorId;
  if (filters?.hostelId) where.floor = { hostelId: filters.hostelId };
  if (filters?.roomType) where.roomType = filters.roomType;
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;

  const rooms = await prisma.room.findMany({
    where,
    include: {
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
      beds: {
        orderBy: { bedLabel: 'asc' },
        include: {
          allocations: {
            where: { isActive: true },
            select: { id: true, studentProfileId: true },
          },
        },
      },
    },
    orderBy: [{ floor: { floorNumber: 'asc' } }, { roomNumber: 'asc' }],
  });

  const formatted = rooms.map((room) => {
    // Dynamic calculation from beds and active allocations
    const activeAllocationsCount = room.beds.reduce(
      (acc, b) => acc + (b.allocations.length > 0 ? 1 : 0),
      0
    );

    const bedsSummary = room.beds.map((b) => ({
      id: b.id,
      bedLabel: b.bedLabel,
      isActive: b.isActive,
      isOccupied: b.allocations.length > 0,
    }));

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      occupancy: room.occupancy, // cached field
      activeAllocationsCount, // authoritative dynamic count
      roomType: room.roomType,
      isActive: room.isActive,
      floor: room.floor,
      bedsCount: room.beds.length,
      availableBedsCount: room.beds.filter((b) => b.isActive && b.allocations.length === 0).length,
      beds: bedsSummary,
    };
  });

  if (filters?.hasAvailableBeds) {
    return formatted.filter((r) => r.availableBedsCount > 0);
  }

  return formatted;
};

export const getRoomById = async (roomId: string) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      floor: {
        include: {
          hostel: true,
        },
      },
      beds: {
        orderBy: { bedLabel: 'asc' },
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
                  studentType: true,
                  department: true,
                  yearOfStudy: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!room) {
    throw new AppError('Room not found.', HTTP_STATUS.NOT_FOUND);
  }

  const bedsWithStatus = room.beds.map((b) => {
    const activeAlloc = b.allocations[0];
    return {
      id: b.id,
      bedLabel: b.bedLabel,
      isActive: b.isActive, // physical availability
      isOccupied: Boolean(activeAlloc), // occupancy
      currentStudent: activeAlloc ? activeAlloc.studentProfile : null,
      allocatedFrom: activeAlloc ? activeAlloc.allocatedFrom : null,
      allocationId: activeAlloc ? activeAlloc.id : null,
    };
  });

  const activeAllocationsCount = bedsWithStatus.filter((b) => b.isOccupied).length;

  return {
    id: room.id,
    roomNumber: room.roomNumber,
    capacity: room.capacity,
    occupancy: room.occupancy,
    activeAllocationsCount,
    roomType: room.roomType,
    isActive: room.isActive,
    floor: {
      id: room.floor.id,
      floorNumber: room.floor.floorNumber,
      floorName: room.floor.floorName,
      hostel: {
        id: room.floor.hostel.id,
        name: room.floor.hostel.name,
        code: room.floor.hostel.code,
      },
    },
    beds: bedsWithStatus,
    availableBedsCount: bedsWithStatus.filter((b) => b.isActive && !b.isOccupied).length,
  };
};

export const updateRoom = async (
  adminUserId: string,
  roomId: string,
  data: UpdateRoomInput
) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { beds: true },
  });
  if (!room) {
    throw new AppError('Room not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (data.capacity !== undefined && data.capacity < room.beds.length) {
    throw new AppError(
      `Cannot reduce room capacity to ${data.capacity} because ${room.beds.length} beds already exist. Delete or deactivate excess beds first.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (data.roomNumber && data.roomNumber !== room.roomNumber) {
    const existing = await prisma.room.findUnique({
      where: {
        floorId_roomNumber: {
          floorId: room.floorId,
          roomNumber: data.roomNumber,
        },
      },
    });
    if (existing) {
      throw new AppError(
        `Room '${data.roomNumber}' already exists on this floor.`,
        HTTP_STATUS.CONFLICT
      );
    }
  }

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: {
      ...(data.roomNumber && { roomNumber: data.roomNumber }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.roomType && { roomType: data.roomType }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'ROOM_UPDATED',
      entityType: 'Room',
      entityId: roomId,
      details: JSON.stringify(data),
    },
  });

  return updated;
};
