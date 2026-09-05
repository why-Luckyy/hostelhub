import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HTTP_STATUS } from '../constants/httpStatus';
import { sendError } from '../utils/apiResponse';
import { JwtPayload } from '../types';

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(
      res,
      'Authentication required. No token provided.',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT.ACCESS_SECRET) as JwtPayload;
    req.user = decoded;
    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return sendError(
        res,
        'Access token expired. Please refresh your session.',
        HTTP_STATUS.UNAUTHORIZED,
        { code: 'TOKEN_EXPIRED' }
      );
    }
    return sendError(
      res,
      'Invalid authentication token.',
      HTTP_STATUS.UNAUTHORIZED
    );
  }
};
