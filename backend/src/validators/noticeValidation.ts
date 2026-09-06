import { z } from 'zod';
import { NoticeCategory, AudienceType } from '@prisma/client';

export const createNoticeSchema = z.object({
  title: z
    .string({ required_error: 'Notice title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z
    .string({ required_error: 'Notice content is required' })
    .trim()
    .min(5, 'Content must be at least 5 characters')
    .max(5000, 'Content cannot exceed 5000 characters'),
  category: z
    .nativeEnum(NoticeCategory, {
      errorMap: () => ({ message: 'Invalid notice category' }),
    })
    .optional()
    .default(NoticeCategory.GENERAL),
  targetAudience: z
    .nativeEnum(AudienceType, {
      errorMap: () => ({ message: 'Invalid target audience' }),
    })
    .optional()
    .default(AudienceType.ALL),
  targetHostelId: z.string().uuid('Invalid target hostel ID').optional().nullable(),
  isPinned: z.boolean().optional().default(false),
});

export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;

export const updateNoticeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  content: z
    .string()
    .trim()
    .min(5, 'Content must be at least 5 characters')
    .max(5000, 'Content cannot exceed 5000 characters')
    .optional(),
  category: z.nativeEnum(NoticeCategory).optional(),
  targetAudience: z.nativeEnum(AudienceType).optional(),
  targetHostelId: z.string().uuid('Invalid target hostel ID').optional().nullable(),
  isPinned: z.boolean().optional(),
});

export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>;

export const queryNoticesSchema = z.object({
  category: z.nativeEnum(NoticeCategory).optional(),
  targetAudience: z.nativeEnum(AudienceType).optional(),
  isPinned: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryNoticesInput = z.infer<typeof queryNoticesSchema>;
