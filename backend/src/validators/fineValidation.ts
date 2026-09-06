import { z } from 'zod';
import { FineStatus } from '@prisma/client';

export const createFineSchema = z.object({
  studentProfileId: z
    .string({ required_error: 'Student profile ID is required' })
    .uuid('Invalid student profile ID'),
  amount: z
    .coerce
    .number({ required_error: 'Fine amount is required' })
    .positive('Fine amount must be strictly greater than 0')
    .max(100000, 'Fine amount cannot exceed ₹1,00,000'),
  reason: z
    .string({ required_error: 'Fine reason is required' })
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
});

export type CreateFineInput = z.infer<typeof createFineSchema>;

export const updateFineStatusSchema = z.object({
  status: z.enum([FineStatus.PAID], {
    errorMap: () => ({ message: 'Status must be PAID' }),
  }),
});

export type UpdateFineStatusInput = z.infer<typeof updateFineStatusSchema>;

export const queryFinesSchema = z.object({
  status: z.nativeEnum(FineStatus).optional(),
  studentProfileId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryFinesInput = z.infer<typeof queryFinesSchema>;
