import { Request, Response, NextFunction } from 'express';
import {
  registerStudentSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../validators/authValidation';
import * as authService from '../services/authService';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerStudentSchema.parse(req.body);
    const result = await authService.registerStudent(validatedData);
    return sendSuccess(
      res,
      result,
      'Registration successful. Welcome to HostelHub!',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    return next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.loginUser(validatedData);
    return sendSuccess(res, result, 'Login successful', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const tokens = await authService.refreshSession(refreshToken);
    return sendSuccess(res, tokens, 'Session refreshed successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getCurrentUser(req.user!.userId);
    return sendSuccess(res, user, 'Profile retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.logoutUser(req.user!.userId);
    return sendSuccess(res, null, 'Logged out successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.userId, validatedData);
    return sendSuccess(res, null, 'Password changed successfully. Please log in again.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};
