import { Request, Response, NextFunction } from 'express';
import {
  createGuestRequestSchema,
  reviewGuestRequestSchema,
  queryGuestRequestsSchema,
  queryGuestPassesSchema,
} from '../validators/guestValidation';
import * as guestService from '../services/guestService';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';

// ----------------------------------------------------
// GUEST REQUEST CONTROLLERS
// ----------------------------------------------------

export const createGuestRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createGuestRequestSchema.parse(req.body);
    const guestRequest = await guestService.createGuestRequest(req.user!.userId, validatedData);
    return sendSuccess(res, guestRequest, 'Guest visit request submitted successfully.', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
};

export const getMyGuestRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryGuestRequestsSchema.parse(req.query);
    const result = await guestService.getMyGuestRequests(req.user!.userId, query);
    return sendSuccess(res, result.requests, 'Fetched my guest requests.', HTTP_STATUS.OK, result.pagination);
  } catch (error) {
    return next(error);
  }
};

export const getGuestRequestById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guestRequest = await guestService.getGuestRequestById(req.user!.userId, req.user!.role, req.params.id);
    return sendSuccess(res, guestRequest, 'Fetched guest request details.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getAllGuestRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryGuestRequestsSchema.parse(req.query);
    const result = await guestService.getAllGuestRequests(query);
    return sendSuccess(res, result.requests, 'Fetched all guest requests.', HTTP_STATUS.OK, result.pagination);
  } catch (error) {
    return next(error);
  }
};

export const reviewGuestRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = reviewGuestRequestSchema.parse(req.body);
    const result = await guestService.reviewGuestRequest(req.user!.userId, req.params.id, validatedData);
    const message =
      validatedData.status === 'APPROVED'
        ? `Guest request approved. Guest pass issued with code: ${result.pass?.passCode}.`
        : 'Guest request rejected.';
    return sendSuccess(res, result, message, HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

// ----------------------------------------------------
// GUEST PASS CONTROLLERS
// ----------------------------------------------------

export const getMyGuestPasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryGuestPassesSchema.parse(req.query);
    const result = await guestService.getMyGuestPasses(req.user!.userId, query);
    return sendSuccess(res, result.passes, 'Fetched my guest passes.', HTTP_STATUS.OK, result.pagination);
  } catch (error) {
    return next(error);
  }
};

export const getGuestPassById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pass = await guestService.getGuestPassById(req.user!.userId, req.user!.role, req.params.id);
    return sendSuccess(res, pass, 'Fetched guest pass details.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getAllGuestPasses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryGuestPassesSchema.parse(req.query);
    const result = await guestService.getAllGuestPasses(query);
    return sendSuccess(res, result.passes, 'Fetched all guest passes.', HTTP_STATUS.OK, result.pagination);
  } catch (error) {
    return next(error);
  }
};
