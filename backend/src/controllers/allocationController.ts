import { Request, Response, NextFunction } from 'express';
import {
  allocateBedSchema,
  vacateBedSchema,
  transferBedSchema,
} from '../validators/hostelValidation';
import * as allocationService from '../services/allocationService';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';

export const allocateBed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = allocateBedSchema.parse(req.body);
    const allocation = await allocationService.allocateBed(req.user!.userId, validatedData);
    return sendSuccess(res, allocation, 'Bed allocated to student successfully.', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
};

export const vacateBed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = vacateBedSchema.parse({
      ...req.body,
      allocationId: req.params.id || req.body.allocationId,
    });
    const result = await allocationService.vacateBed(req.user!.userId, validatedData);
    return sendSuccess(res, result.vacatedAllocation, result.message, HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const transferBed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = transferBedSchema.parse(req.body);
    const result = await allocationService.transferBed(req.user!.userId, validatedData);
    return sendSuccess(res, result.allocation, result.message, HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getMyAllocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allocation = await allocationService.getMyAllocation(req.user!.userId);
    return sendSuccess(res, allocation, allocation.message, HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getAllocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const studentProfileId = req.query.studentProfileId as string | undefined;
    const roomId = req.query.roomId as string | undefined;
    const hostelId = req.query.hostelId as string | undefined;

    const allocations = await allocationService.getAllocations({
      isActive,
      studentProfileId,
      roomId,
      hostelId,
    });
    return sendSuccess(res, allocations, 'Allocations retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};
