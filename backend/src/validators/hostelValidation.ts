import { z } from 'zod';
import { GenderAllowed, RoomType } from '@prisma/client';

// ----------------------------------------------------
// HOSTEL SCHEMAS
// ----------------------------------------------------

export const createHostelSchema = z.object({
  name: z.string().trim().min(2, 'Hostel name must be at least 2 characters').max(100),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Hostel code must be at least 2 characters')
    .max(20, 'Hostel code cannot exceed 20 characters'),
  genderAllowed: z.nativeEnum(GenderAllowed, {
    errorMap: () => ({ message: 'Gender allowed must be MALE, FEMALE, or COED' }),
  }),
  totalFloors: z.number().int().min(1, 'Hostel must have at least 1 floor').max(20),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type CreateHostelInput = z.infer<typeof createHostelSchema>;

export const updateHostelSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  genderAllowed: z.nativeEnum(GenderAllowed).optional(),
  totalFloors: z.number().int().min(1).max(20).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateHostelInput = z.infer<typeof updateHostelSchema>;

// ----------------------------------------------------
// FLOOR SCHEMAS
// ----------------------------------------------------

export const createFloorSchema = z.object({
  hostelId: z.string().uuid('Valid hostel UUID required'),
  floorNumber: z.number().int().min(0, 'Floor number cannot be negative').max(50),
  floorName: z.string().trim().min(1, 'Floor name is required').max(50),
});

export type CreateFloorInput = z.infer<typeof createFloorSchema>;

export const updateFloorSchema = z.object({
  floorName: z.string().trim().min(1).max(50).optional(),
});

export type UpdateFloorInput = z.infer<typeof updateFloorSchema>;

// ----------------------------------------------------
// ROOM SCHEMAS
// ----------------------------------------------------

export const createRoomSchema = z.object({
  floorId: z.string().uuid('Valid floor UUID required'),
  roomNumber: z.string().trim().min(1, 'Room number is required').max(20),
  capacity: z.number().int().min(1, 'Room capacity must be at least 1').max(10, 'Capacity cannot exceed 10'),
  roomType: z.nativeEnum(RoomType).optional().default(RoomType.NON_AC),
  isActive: z.boolean().optional().default(true),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z.object({
  roomNumber: z.string().trim().min(1).max(20).optional(),
  capacity: z.number().int().min(1).max(10).optional(),
  roomType: z.nativeEnum(RoomType).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

// ----------------------------------------------------
// BED SCHEMAS
// ----------------------------------------------------

export const createBedSchema = z.object({
  roomId: z.string().uuid('Valid room UUID required'),
  bedLabel: z.string().trim().min(1, 'Bed label is required').max(20),
  isActive: z.boolean().optional().default(true),
});

export type CreateBedInput = z.infer<typeof createBedSchema>;

export const updateBedSchema = z.object({
  bedLabel: z.string().trim().min(1).max(20).optional(),
  isActive: z.boolean().optional(), // Physical availability (e.g. maintenance)
});

export type UpdateBedInput = z.infer<typeof updateBedSchema>;

// ----------------------------------------------------
// ALLOCATION SCHEMAS
// ----------------------------------------------------

export const allocateBedSchema = z.object({
  studentProfileId: z.string().uuid('Valid student profile UUID required'),
  bedId: z.string().uuid('Valid bed UUID required'),
});

export type AllocateBedInput = z.infer<typeof allocateBedSchema>;

export const vacateBedSchema = z.object({
  allocationId: z.string().uuid('Valid allocation UUID required').optional(),
  studentProfileId: z.string().uuid('Valid student profile UUID required').optional(),
}).refine((data) => data.allocationId || data.studentProfileId, {
  message: 'Either allocationId or studentProfileId must be provided',
});

export type VacateBedInput = z.infer<typeof vacateBedSchema>;

export const transferBedSchema = z.object({
  studentProfileId: z.string().uuid('Valid student profile UUID required'),
  targetBedId: z.string().uuid('Valid target bed UUID required'),
});

export type TransferBedInput = z.infer<typeof transferBedSchema>;
