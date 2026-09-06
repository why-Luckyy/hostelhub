import { z } from 'zod';

export const staffRoleEnum = z.enum([
  'COOK',
  'SERVER',
  'CLEANING_STAFF',
  'FOOD_TRANSFER',
  'OTHER',
]);

export const staffAttendanceStatusEnum = z.enum([
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY',
]);

const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createStaffSchema = z.object({
  name: z
    .string({ required_error: 'Staff name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  role: staffRoleEnum,
  phone: z
    .string()
    .trim()
    .max(20, 'Phone number cannot exceed 20 characters')
    .optional()
    .nullable(),
  expectedStartTime: z
    .string()
    .trim()
    .regex(timeFormatRegex, 'Expected start time must be in HH:mm format (24-hour, e.g. 06:30)')
    .optional()
    .default('06:30'),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  role: staffRoleEnum.optional(),
  phone: z
    .string()
    .trim()
    .max(20, 'Phone number cannot exceed 20 characters')
    .optional()
    .nullable(),
  expectedStartTime: z
    .string()
    .trim()
    .regex(timeFormatRegex, 'Expected start time must be in HH:mm format (24-hour, e.g. 06:30)')
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const toggleStaffStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});

export type ToggleStaffStatusInput = z.infer<typeof toggleStaffStatusSchema>;

export const checkInStaffSchema = z.object({
  staffId: z.string().uuid('Valid staff UUID is required'),
  checkInTime: z.coerce.date().optional(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export type CheckInStaffInput = z.infer<typeof checkInStaffSchema>;

export const checkOutStaffSchema = z.object({
  staffId: z.string().uuid('Valid staff UUID is required'),
  checkOutTime: z.coerce.date().optional(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export type CheckOutStaffInput = z.infer<typeof checkOutStaffSchema>;

export const markAttendanceSchema = z.object({
  staffId: z.string().uuid('Valid staff UUID is required'),
  date: z.coerce.date().optional(),
  status: staffAttendanceStatusEnum,
  checkInTime: z.coerce.date().optional().nullable(),
  checkOutTime: z.coerce.date().optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const queryStaffAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD').optional(),
  staffId: z.string().uuid().optional(),
  role: staffRoleEnum.optional(),
  status: staffAttendanceStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryStaffAttendanceInput = z.infer<typeof queryStaffAttendanceSchema>;
