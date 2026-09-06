import { randomUUID, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { ROLES, STUDENT_TYPES, UserRole, StudentType } from '../constants/roles';
import { HTTP_STATUS } from '../constants/httpStatus';
import { JwtPayload } from '../types';
import {
  RegisterStudentInput,
  LoginInput,
  ChangePasswordInput,
} from '../validators/authValidation';

export class AuthError extends Error {
  statusCode: number;
  isOperational = true;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Pre-hash refresh token with SHA-256 before bcrypt to prevent bcrypt's 72-byte truncation
 */
export const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

/**
 * Generate Access Token (Short-lived, e.g. 15m)
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT.ACCESS_SECRET, {
    expiresIn: env.JWT.ACCESS_EXPIRY as any,
  });
};

/**
 * Generate Refresh Token (Long-lived, e.g. 7d)
 * Includes a cryptographically random jti to ensure uniqueness across rotations.
 */
export const generateRefreshToken = (payload: { userId: string }): string => {
  return jwt.sign({ ...payload, jti: randomUUID() }, env.JWT.REFRESH_SECRET, {
    expiresIn: env.JWT.REFRESH_EXPIRY as any,
  });
};

/**
 * Register a new Student with profile in an atomic transaction
 */
export const registerStudent = async (input: RegisterStudentInput) => {
  // 1. Check if email already registered
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingUser) {
    throw new AuthError('An account with this email address already exists.', HTTP_STATUS.CONFLICT);
  }

  // 2. Check if roll number already exists
  const existingProfile = await prisma.studentProfile.findUnique({
    where: { rollNumber: input.rollNumber },
  });
  if (existingProfile) {
    throw new AuthError('A student with this roll number is already registered.', HTTP_STATUS.CONFLICT);
  }

  // 3. Hash password with bcrypt cost 12
  const passwordHash = await bcrypt.hash(input.password, 12);

  // 4. Create User and StudentProfile atomically
  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: ROLES.STUDENT,
        isActive: true,
      },
    });

    const newProfile = await tx.studentProfile.create({
      data: {
        userId: newUser.id,
        rollNumber: input.rollNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        studentType: input.studentType as StudentType,
        department: input.department,
        yearOfStudy: input.yearOfStudy,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianEmail: input.guardianEmail || null,
        isAllocated: false,
      },
    });

    return { user: newUser, profile: newProfile };
  });

  // 5. Generate tokens
  const jwtPayload: JwtPayload = {
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role as UserRole,
    studentProfileId: result.profile.id,
    studentType: result.profile.studentType as StudentType,
  };

  const accessToken = generateAccessToken(jwtPayload);
  const refreshToken = generateRefreshToken({ userId: result.user.id });

  // 6. Save hashed refresh token (pre-hashed with SHA-256 to avoid bcrypt 72-byte truncation)
  const hashedRefreshToken = await bcrypt.hash(hashToken(refreshToken), 10);
  await prisma.user.update({
    where: { id: result.user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
    },
    profile: result.profile,
    accessToken,
    refreshToken,
  };
};

/**
 * Authenticate User (Student, Warden, or Mess Incharge)
 */
export const loginUser = async (input: LoginInput) => {
  // 1. Fetch user by email
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      studentProfile: true,
    },
  });

  if (!user) {
    throw new AuthError('Invalid email or password.', HTTP_STATUS.UNAUTHORIZED);
  }

  if (!user.isActive) {
    throw new AuthError('Account is disabled. Please contact the hostel administrator.', HTTP_STATUS.FORBIDDEN);
  }

  // 2. Compare password hash
  const isMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isMatch) {
    throw new AuthError('Invalid email or password.', HTTP_STATUS.UNAUTHORIZED);
  }

  // 3. Construct JWT Payload
  const jwtPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    studentProfileId: user.studentProfile?.id,
    studentType: user.studentProfile?.studentType as StudentType | undefined,
  };

  const accessToken = generateAccessToken(jwtPayload);
  const refreshToken = generateRefreshToken({ userId: user.id });

  // 4. Update hashed refresh token in database (pre-hashed with SHA-256)
  const hashedRefreshToken = await bcrypt.hash(hashToken(refreshToken), 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: user.studentProfile || null,
    accessToken,
    refreshToken,
  };
};

/**
 * Exchange valid Refresh Token for a fresh Access Token & rotated Refresh Token
 */
export const refreshSession = async (incomingRefreshToken: string) => {
  try {
    const decoded = jwt.verify(incomingRefreshToken, env.JWT.REFRESH_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: true,
      },
    });

    if (!user || !user.isActive || !user.refreshToken) {
      throw new AuthError('Session expired. Please log in again.', HTTP_STATUS.UNAUTHORIZED);
    }

    // Verify refresh token hash (pre-hashed with SHA-256 to avoid bcrypt 72-byte limit)
    const isTokenValid = await bcrypt.compare(hashToken(incomingRefreshToken), user.refreshToken);
    if (!isTokenValid) {
      // Possible token reuse attempt: invalidate stored token for safety
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });
      throw new AuthError('Invalid refresh token. Session revoked.', HTTP_STATUS.UNAUTHORIZED);
    }

    // Issue new tokens (Token rotation)
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      studentProfileId: user.studentProfile?.id,
      studentType: user.studentProfile?.studentType as StudentType | undefined,
    };

    const newAccessToken = generateAccessToken(jwtPayload);
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    // Store new hashed refresh token
    const hashedNewRefreshToken = await bcrypt.hash(hashToken(newRefreshToken), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedNewRefreshToken },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error: any) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Invalid or expired refresh token.', HTTP_STATUS.UNAUTHORIZED);
  }
};

/**
 * Get current authenticated user details and residential info
 */
export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      studentProfile: true,
    },
  });

  if (!user) {
    throw new AuthError('User profile not found.', HTTP_STATUS.NOT_FOUND);
  }

  return user;
};

/**
 * Revoke session upon logout
 */
export const logoutUser = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};

/**
 * Change authenticated user's password
 */
export const changePassword = async (userId: string, input: ChangePasswordInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AuthError('User not found.', HTTP_STATUS.NOT_FOUND);
  }

  const isMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AuthError('Current password is incorrect.', HTTP_STATUS.BAD_REQUEST);
  }

  const newHash = await bcrypt.hash(input.newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      refreshToken: null, // Force re-login on all devices
    },
  });
};
