import { z } from 'zod';
import { GuestStatus, MealType } from '@prisma/client';

export const createGuestRequestSchema = z.object({
  guestName: z
    .string({ required_error: 'Guest name is required' })
    .trim()
    .min(2, 'Guest name must be at least 2 characters')
    .max(100, 'Guest name cannot exceed 100 characters'),
  relationship: z
    .string({ required_error: 'Relationship to student is required' })
    .trim()
    .min(2, 'Relationship must be at least 2 characters')
    .max(50, 'Relationship cannot exceed 50 characters'),
  visitDate: z
    .string({ required_error: 'Visit date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Visit date must be in YYYY-MM-DD format')
    .refine((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      // Date should not be in the past (allow today onwards in UTC/local)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, {
      message: 'Visit date cannot be in the past',
    }),
  requestedMeal: z.nativeEnum(MealType, {
    errorMap: () => ({ message: 'Requested meal must be NONE, BREAKFAST, LUNCH, DINNER, or SNACKS' }),
  }).optional().default(MealType.NONE),
  numberOfGuests: z
    .number()
    .int()
    .min(1, 'Number of guests must be at least 1')
    .max(5, 'Maximum of 5 guests allowed per request')
    .optional()
    .default(1),
  reason: z
    .string({ required_error: 'Reason for visit is required' })
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(1000, 'Reason cannot exceed 1000 characters'),
});

export type CreateGuestRequestInput = z.infer<typeof createGuestRequestSchema>;

export const reviewGuestRequestSchema = z.object({
  status: z.enum([GuestStatus.APPROVED, GuestStatus.REJECTED], {
    errorMap: () => ({ message: 'Review status must be APPROVED or REJECTED' }),
  }),
  remarks: z.string().trim().max(500, 'Remarks cannot exceed 500 characters').optional().nullable(),
});

export type ReviewGuestRequestInput = z.infer<typeof reviewGuestRequestSchema>;

export const queryGuestRequestsSchema = z.object({
  status: z.nativeEnum(GuestStatus).optional(),
  hostStudentProfileId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryGuestRequestsInput = z.infer<typeof queryGuestRequestsSchema>;

export const queryGuestPassesSchema = z.object({
  isVerified: z
    .preprocess((val) => {
      if (val === undefined) return undefined;
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
      }
      return val;
    }, z.boolean({ invalid_type_error: 'isVerified must be a boolean (true or false)' }))
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryGuestPassesInput = z.infer<typeof queryGuestPassesSchema>;
