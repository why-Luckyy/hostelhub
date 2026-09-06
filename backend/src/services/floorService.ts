import { prisma } from '../config/db';
import { CreateFloorInput, UpdateFloorInput } from '../validators/hostelValidation';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';

export const createFloor = async (adminUserId: string, data: CreateFloorInput) => {
  const hostel = await prisma.hostel.findUnique({
    where: { id: data.hostelId },
  });
  if (!hostel) {
    throw new AppError('Hostel not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (data.floorNumber > hostel.totalFloors) {
    throw new AppError(
      `Floor number ${data.floorNumber} exceeds total floors (${hostel.totalFloors}) configured for ${hostel.name}.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const existingFloor = await prisma.floor.findUnique({
    where: {
      hostelId_floorNumber: {
        hostelId: data.hostelId,
        floorNumber: data.floorNumber,
      },
    },
  });
  if (existingFloor) {
    throw new AppError(
      `Floor ${data.floorNumber} already exists in ${hostel.name}.`,
      HTTP_STATUS.CONFLICT
    );
  }

  const floor = await prisma.floor.create({
    data: {
      hostelId: data.hostelId,
      floorNumber: data.floorNumber,
      floorName: data.floorName,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'FLOOR_CREATED',
      entityType: 'Floor',
      entityId: floor.id,
      details: JSON.stringify({ hostelId: data.hostelId, floorNumber: data.floorNumber }),
    },
  });

  return floor;
};

export const getFloorsByHostel = async (hostelId: string) => {
  const hostel = await prisma.hostel.findUnique({
    where: { id: hostelId },
  });
  if (!hostel) {
    throw new AppError('Hostel not found.', HTTP_STATUS.NOT_FOUND);
  }

  const floors = await prisma.floor.findMany({
    where: { hostelId },
    include: {
      rooms: {
        select: {
          id: true,
          roomNumber: true,
          capacity: true,
          occupancy: true,
          roomType: true,
          isActive: true,
        },
      },
    },
    orderBy: { floorNumber: 'asc' },
  });

  return floors.map((f) => {
    const totalRooms = f.rooms.length;
    const capacity = f.rooms.reduce((acc, r) => acc + r.capacity, 0);
    const occupancy = f.rooms.reduce((acc, r) => acc + r.occupancy, 0);
    return {
      id: f.id,
      hostelId: f.hostelId,
      floorNumber: f.floorNumber,
      floorName: f.floorName,
      totalRooms,
      capacity,
      occupancy,
      vacant: Math.max(0, capacity - occupancy),
      rooms: f.rooms,
    };
  });
};

export const getFloorById = async (floorId: string) => {
  const floor = await prisma.floor.findUnique({
    where: { id: floorId },
    include: {
      hostel: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      rooms: {
        include: {
          beds: {
            orderBy: { bedLabel: 'asc' },
            include: {
              allocations: {
                where: { isActive: true },
                select: {
                  id: true,
                  studentProfileId: true,
                },
              },
            },
          },
        },
        orderBy: { roomNumber: 'asc' },
      },
    },
  });

  if (!floor) {
    throw new AppError('Floor not found.', HTTP_STATUS.NOT_FOUND);
  }

  return floor;
};

export const updateFloor = async (
  adminUserId: string,
  floorId: string,
  data: UpdateFloorInput
) => {
  const floor = await prisma.floor.findUnique({
    where: { id: floorId },
  });
  if (!floor) {
    throw new AppError('Floor not found.', HTTP_STATUS.NOT_FOUND);
  }

  const updated = await prisma.floor.update({
    where: { id: floorId },
    data: {
      ...(data.floorName && { floorName: data.floorName }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'FLOOR_UPDATED',
      entityType: 'Floor',
      entityId: floorId,
      details: JSON.stringify(data),
    },
  });

  return updated;
};
