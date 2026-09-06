import { z } from 'zod';
import { LeaveStatus } from '@prisma/client';

export const createLeaveRequestSchema = z
  .object({
    startDate: z
      .string({ required_error: 'Start date and time is required' })
      .datetime({ message: 'Start date must be a valid ISO 8601 datetime string' }),
    endDate: z
      .string({ required_error: 'End date and time is required' })
      .datetime({ message: 'End date must be a valid ISO 8601 datetime string' }),
    destination: z
      .string({ required_error: 'Destination is required' })
      .trim()
      .min(2, 'Destination must be at least 2 characters')
      .max(255, 'Destination cannot exceed 255 characters'),
    emergencyContact: z
      .string({ required_error: 'Emergency contact is required' })
      .trim()
      .regex(/^[0-9+ -]{10,20}$/, 'Emergency contact must be a valid phone number (10-20 digits)'),
    reason: z
      .string({ required_error: 'Reason is required' })
      .trim()
      .min(5, 'Reason must be at least 5 characters')
      .max(1000, 'Reason cannot exceed 1000 characters'),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be strictly after start date',
    path: ['endDate'],
  });

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const reviewLeaveRequestSchema = z.object({
  status: z.enum([LeaveStatus.APPROVED, LeaveStatus.REJECTED], {
    errorMap: () => ({ message: 'Review status must be APPROVED or REJECTED' }),
  }),
  remarks: z.string().trim().max(500, 'Remarks cannot exceed 500 characters').optional().nullable(),
});

export type ReviewLeaveRequestInput = z.infer<typeof reviewLeaveRequestSchema>;

export const queryLeaveRequestsSchema = z.object({
  status: z.nativeEnum(LeaveStatus).optional(),
  studentProfileId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryLeaveRequestsInput = z.infer<typeof queryLeaveRequestsSchema>;
