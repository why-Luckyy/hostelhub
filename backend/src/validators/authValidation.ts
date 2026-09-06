import { z } from 'zod';
import { STUDENT_TYPES } from '../constants/roles';

export const registerStudentSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  rollNumber: z.string().trim().toUpperCase().min(3, 'Roll number must be at least 3 characters'),
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().min(10, 'Phone number must be at least 10 digits'),
  studentType: z.enum([STUDENT_TYPES.HOSTELER, STUDENT_TYPES.DAY_SCHOLAR], {
    errorMap: () => ({ message: 'Student type must be either HOSTELER or DAY_SCHOLAR' }),
  }),
  department: z.string().trim().min(2, 'Department is required'),
  yearOfStudy: z.number().int().min(1, 'Year of study must be at least 1').max(6, 'Year of study exceeds maximum'),
  guardianName: z.string().trim().min(2, 'Guardian name is required'),
  guardianPhone: z.string().trim().min(10, 'Guardian phone must be at least 10 digits'),
  guardianEmail: z.string().trim().email('Invalid guardian email').optional().or(z.literal('')),
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
