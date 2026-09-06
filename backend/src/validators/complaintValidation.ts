import { z } from 'zod';
import { ComplaintCategory, ComplaintPriority } from '@prisma/client';

export const createComplaintSchema = z.object({
  title: z
    .string({ required_error: 'Complaint title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string({ required_error: 'Complaint description is required' })
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  category: z.nativeEnum(ComplaintCategory, {
    errorMap: () => ({ message: 'Invalid complaint category' }),
  }),
  priority: z
    .nativeEnum(ComplaintPriority, {
      errorMap: () => ({ message: 'Invalid complaint priority' }),
    })
    .optional()
    .default(ComplaintPriority.MEDIUM),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const resolveComplaintSchema = z.object({
  resolutionNotes: z
    .string()
    .trim()
    .max(500, 'Resolution notes cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;

export const queryComplaintsSchema = z.object({
  status: z.enum(['PENDING', 'SOLVED']).optional(),
  category: z.nativeEnum(ComplaintCategory).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryComplaintsInput = z.infer<typeof queryComplaintsSchema>;
