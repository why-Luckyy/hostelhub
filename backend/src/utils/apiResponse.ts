import { Response } from 'express';
import { ApiResponse } from '../types';
import { HTTP_STATUS, HttpStatusCode } from '../constants/httpStatus';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode: HttpStatusCode = HTTP_STATUS.OK,
  meta?: ApiResponse['meta']
): Response => {
  const responsePayload: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(responsePayload);
};

export const sendError = (
  res: Response,
  message = 'An unexpected error occurred',
  statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  error: any = null
): Response => {
  const responsePayload: ApiResponse = {
    success: false,
    message,
    ...(error && { error }),
  };
  return res.status(statusCode).json(responsePayload);
};
