import { prisma } from '../config/db';
import { CreateHostelInput, UpdateHostelInput } from '../validators/hostelValidation';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import { GenderAllowed } from '@prisma/client';

export const createHostel = async (adminUserId: string, data: CreateHostelInput) => {
  const existingCode = await prisma.hostel.findUnique({
    where: { code: data.code },
  });
  if (existingCode) {
    throw new AppError(`Hostel with code '${data.code}' already exists.`, HTTP_STATUS.CONFLICT);
  }

  const existingName = await prisma.hostel.findUnique({
    where: { name: data.name },
  });
  if (existingName) {
    throw new AppError(`Hostel with name '${data.name}' already exists.`, HTTP_STATUS.CONFLICT);
  }

  const hostel = await prisma.hostel.create({
    data: {
      name: data.name,
      code: data.code,
      genderAllowed: data.genderAllowed,
      totalFloors: data.totalFloors,
      description: data.description || null,
      isActive: data.isActive ?? true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'HOSTEL_CREATED',
      entityType: 'Hostel',
      entityId: hostel.id,
      details: JSON.stringify({ name: hostel.name, code: hostel.code }),
    },
  });

  return hostel;
};

export const getAllHostels = async (filters?: {
  genderAllowed?: GenderAllowed;
  isActive?: boolean;
}) => {
  const where: any = {};
  if (filters?.genderAllowed) where.genderAllowed = filters.genderAllowed;
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;

  const hostels = await prisma.hostel.findMany({
    where,
    include: {
      floors: {
        include: {
          rooms: {
            select: {
              capacity: true,
              occupancy: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return hostels.map((hostel) => {
    let totalRooms = 0;
    let totalCapacity = 0;
    let totalOccupancy = 0;

    for (const floor of hostel.floors) {
      totalRooms += floor.rooms.length;
      for (const room of floor.rooms) {
        totalCapacity += room.capacity;
        totalOccupancy += room.occupancy;
      }
    }

    return {
      id: hostel.id,
      name: hostel.name,
      code: hostel.code,
      genderAllowed: hostel.genderAllowed,
      totalFloors: hostel.totalFloors,
      description: hostel.description,
      isActive: hostel.isActive,
      createdAt: hostel.createdAt,
      updatedAt: hostel.updatedAt,
      stats: {
        totalFloorsRecorded: hostel.floors.length,
        totalRooms,
        totalCapacity,
        totalOccupancy,
        totalVacant: Math.max(0, totalCapacity - totalOccupancy),
        occupancyRate: totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0,
      },
    };
  });
};

export const getHostelById = async (hostelId: string) => {
  const hostel = await prisma.hostel.findUnique({
    where: { id: hostelId },
    include: {
      floors: {
        orderBy: { floorNumber: 'asc' },
        include: {
          rooms: {
            orderBy: { roomNumber: 'asc' },
            include: {
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
                          department: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!hostel) {
    throw new AppError('Hostel not found.', HTTP_STATUS.NOT_FOUND);
  }

  let totalCapacity = 0;
  let totalOccupancy = 0;
  let totalRooms = 0;

  const floorsSummary = hostel.floors.map((floor) => {
    let floorCapacity = 0;
    let floorOccupancy = 0;

    const roomsSummary = floor.rooms.map((room) => {
      floorCapacity += room.capacity;
      floorOccupancy += room.occupancy;
      totalRooms += 1;

      const bedsWithStatus = room.beds.map((bed) => {
        const activeAlloc = bed.allocations[0];
        return {
          id: bed.id,
          bedLabel: bed.bedLabel,
          isActive: bed.isActive, // Physical usability
          isOccupied: Boolean(activeAlloc), // Student occupancy
          occupiedBy: activeAlloc ? activeAlloc.studentProfile : null,
        };
      });

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        capacity: room.capacity,
        occupancy: room.occupancy,
        roomType: room.roomType,
        isActive: room.isActive,
        beds: bedsWithStatus,
      };
    });

    totalCapacity += floorCapacity;
    totalOccupancy += floorOccupancy;

    return {
      id: floor.id,
      floorNumber: floor.floorNumber,
      floorName: floor.floorName,
      totalRooms: floor.rooms.length,
      capacity: floorCapacity,
      occupancy: floorOccupancy,
      rooms: roomsSummary,
    };
  });

  return {
    id: hostel.id,
    name: hostel.name,
    code: hostel.code,
    genderAllowed: hostel.genderAllowed,
    totalFloors: hostel.totalFloors,
    description: hostel.description,
    isActive: hostel.isActive,
    stats: {
      totalFloors: hostel.floors.length,
      totalRooms,
      totalCapacity,
      totalOccupancy,
      totalVacant: Math.max(0, totalCapacity - totalOccupancy),
      occupancyRate: totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0,
    },
    floors: floorsSummary,
  };
};

export const updateHostel = async (
  adminUserId: string,
  hostelId: string,
  data: UpdateHostelInput
) => {
  const hostel = await prisma.hostel.findUnique({
    where: { id: hostelId },
  });
  if (!hostel) {
    throw new AppError('Hostel not found.', HTTP_STATUS.NOT_FOUND);
  }

  if (data.name && data.name !== hostel.name) {
    const existing = await prisma.hostel.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new AppError(`Hostel with name '${data.name}' already exists.`, HTTP_STATUS.CONFLICT);
    }
  }

  const updated = await prisma.hostel.update({
    where: { id: hostelId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.genderAllowed && { genderAllowed: data.genderAllowed }),
      ...(data.totalFloors !== undefined && { totalFloors: data.totalFloors }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: 'HOSTEL_UPDATED',
      entityType: 'Hostel',
      entityId: hostelId,
      details: JSON.stringify(data),
    },
  });

  return updated;
};

export const getHostelOccupancy = async (hostelId: string) => {
  const hostel = await getHostelById(hostelId);
  return {
    hostelId: hostel.id,
    hostelName: hostel.name,
    code: hostel.code,
    stats: hostel.stats,
    floorsBreakdown: hostel.floors.map((f) => ({
      floorId: f.id,
      floorNumber: f.floorNumber,
      floorName: f.floorName,
      totalRooms: f.totalRooms,
      capacity: f.capacity,
      occupancy: f.occupancy,
      vacant: Math.max(0, f.capacity - f.occupancy),
    })),
  };
};
