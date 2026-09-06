import { Request, Response, NextFunction } from 'express';
import {
  createLeaveRequestSchema,
  reviewLeaveRequestSchema,
  queryLeaveRequestsSchema,
} from '../validators/leaveValidation';
import * as leaveService from '../services/leaveService';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';

export const createLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createLeaveRequestSchema.parse(req.body);
    const leave = await leaveService.createLeaveRequest(req.user!.userId, validatedData);
    return sendSuccess(res, leave, 'Gate pass / leave request submitted successfully.', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
};

export const getMyLeaveRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryLeaveRequestsSchema.parse(req.query);
    const result = await leaveService.getMyLeaveRequests(req.user!.userId, query);
    return sendSuccess(res, result.requests, 'Fetched my leave requests successfully.', HTTP_STATUS.OK, result.pagination);
  } catch (error) {
    return next(error);
  }
};

export const getLeaveRequestById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leave = await leaveService.getLeaveRequestById(req.user!.userId, req.user!.role, req.params.id);
    return sendSuccess(res, leave, 'Fetched leave request details.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const cancelLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leave = await leaveService.cancelLeaveRequest(req.user!.userId, req.params.id);
    return sendSuccess(res, leave, 'Leave request cancelled successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getAllLeaveRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryLeaveRequestsSchema.parse(req.query);
    const result = await leaveService.getAllLeaveRequests(query);
    return sendSuccess(res, result.requests, 'Fetched all leave requests.', HTTP_STATUS.OK, result.pagination);
  } catch (error) {
    return next(error);
  }
};

export const reviewLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = reviewLeaveRequestSchema.parse(req.body);
    const leave = await leaveService.reviewLeaveRequest(req.user!.userId, req.params.id, validatedData);
    const action = validatedData.status === 'APPROVED' ? 'approved' : 'rejected';
    return sendSuccess(res, leave, `Leave request has been ${action} successfully.`, HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};
