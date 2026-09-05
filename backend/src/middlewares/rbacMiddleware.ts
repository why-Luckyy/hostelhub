import { Request, Response, NextFunction } from 'express';
import { UserRole, STUDENT_TYPES } from '../constants/roles';
import { HTTP_STATUS } from '../constants/httpStatus';
import { sendError } from '../utils/apiResponse';
import { prisma } from '../config/db';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(
        res,
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden: Access restricted to ${allowedRoles.join(', ')}`,
        HTTP_STATUS.FORBIDDEN
      );
    }

    return next();
  };
};

export const requireHosteler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.userId },
    });

    if (!profile) {
      return sendError(
        res,
        'Student profile not found.',
        HTTP_STATUS.NOT_FOUND
      );
    }

    if (profile.studentType !== STUDENT_TYPES.HOSTELER) {
      return sendError(
        res,
        'Access denied: This feature is only accessible to residential hostelers.',
        HTTP_STATUS.FORBIDDEN
      );
    }

    req.studentProfile = profile;
    return next();
  } catch (error) {
    return next(error);
  }
};
