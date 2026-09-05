import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../constants/httpStatus';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorDetails = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(
      res,
      'Validation failed',
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      errorDetails
    );
  }

  // Handle SyntaxError (e.g. malformed JSON body)
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, 'Malformed JSON payload', HTTP_STATUS.BAD_REQUEST);
  }

  // Handle Prisma known request errors
  if (err.code === 'P2002') {
    return sendError(
      res,
      `A record with this ${err.meta?.target || 'field'} already exists.`,
      HTTP_STATUS.CONFLICT
    );
  }

  if (err.code === 'P2025') {
    return sendError(res, 'Requested resource was not found.', HTTP_STATUS.NOT_FOUND);
  }

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.isOperational || env.isDev
    ? err.message || 'Internal server error'
    : 'An unexpected internal error occurred';

  return sendError(
    res,
    message,
    statusCode,
    env.isDev ? { stack: err.stack } : undefined
  );
};
