import { z } from 'zod';
import { DayOfWeek, MealType } from '@prisma/client';

// ----------------------------------------------------
// MENU VALIDATORS
// ----------------------------------------------------

export const createMessMenuSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek, {
    errorMap: () => ({ message: 'dayOfWeek must be one of MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY' }),
  }),
  mealType: z.nativeEnum(MealType, {
    errorMap: () => ({ message: 'mealType must be one of BREAKFAST, LUNCH, DINNER, SNACKS' }),
  }).refine((val) => val !== MealType.NONE, {
    message: 'Meal type cannot be NONE for a menu entry',
  }),
  items: z
    .string({ required_error: 'Menu items description is required' })
    .trim()
    .min(2, 'Menu items must be at least 2 characters')
    .max(1000, 'Menu items cannot exceed 1000 characters'),
  specialNotes: z
    .string()
    .trim()
    .max(500, 'Special notes cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export type CreateMessMenuInput = z.infer<typeof createMessMenuSchema>;

export const updateMessMenuSchema = z.object({
  items: z
    .string()
    .trim()
    .min(2, 'Menu items must be at least 2 characters')
    .max(1000, 'Menu items cannot exceed 1000 characters')
    .optional(),
  specialNotes: z
    .string()
    .trim()
    .max(500, 'Special notes cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export type UpdateMessMenuInput = z.infer<typeof updateMessMenuSchema>;

export const queryMessMenuSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
  mealType: z.nativeEnum(MealType).optional(),
});

export type QueryMessMenuInput = z.infer<typeof queryMessMenuSchema>;

// ----------------------------------------------------
// FEEDBACK VALIDATORS
// ----------------------------------------------------

export const createMessFeedbackSchema = z.object({
  mealDate: z
    .string({ required_error: 'mealDate is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'mealDate must be in YYYY-MM-DD format')
    .refine((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      const todayKolkataStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      return val <= todayKolkataStr;
    }, {
      message: 'Feedback cannot be submitted for a future date',
    }),
  mealType: z.nativeEnum(MealType, {
    errorMap: () => ({ message: 'mealType must be BREAKFAST, LUNCH, DINNER, or SNACKS' }),
  }).refine((val) => val !== MealType.NONE, {
    message: 'Meal type cannot be NONE for feedback',
  }),
  rating: z
    .number({ required_error: 'Overall rating is required' })
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  foodQualityRating: z
    .number({ required_error: 'Food quality rating is required' })
    .int('Food quality rating must be an integer')
    .min(1, 'Food quality rating must be at least 1')
    .max(5, 'Food quality rating cannot exceed 5'),
  cleanlinessRating: z
    .number({ required_error: 'Cleanliness rating is required' })
    .int('Cleanliness rating must be an integer')
    .min(1, 'Cleanliness rating must be at least 1')
    .max(5, 'Cleanliness rating cannot exceed 5'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Comment cannot exceed 1000 characters')
    .optional()
    .nullable(),
});

export type CreateMessFeedbackInput = z.infer<typeof createMessFeedbackSchema>;

export const queryMessFeedbackSchema = z.object({
  mealDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'mealDate must be in YYYY-MM-DD format')
    .optional(),
  mealType: z.nativeEnum(MealType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryMessFeedbackInput = z.infer<typeof queryMessFeedbackSchema>;

// ----------------------------------------------------
// ANALYTICS VALIDATORS
// ----------------------------------------------------

export const queryMealAnalyticsSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .optional(),
  mealType: z.nativeEnum(MealType).optional(),
});

export type QueryMealAnalyticsInput = z.infer<typeof queryMealAnalyticsSchema>;
