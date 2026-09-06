import { Request, Response, NextFunction } from 'express';
import { createFloorSchema, updateFloorSchema } from '../validators/hostelValidation';
import * as floorService from '../services/floorService';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';

export const createFloor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createFloorSchema.parse(req.body);
    const floor = await floorService.createFloor(req.user!.userId, validatedData);
    return sendSuccess(res, floor, 'Floor created successfully.', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
};

export const getFloorsByHostel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const floors = await floorService.getFloorsByHostel(req.params.hostelId);
    return sendSuccess(res, floors, 'Floors retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getFloorById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const floor = await floorService.getFloorById(req.params.id);
    return sendSuccess(res, floor, 'Floor retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const updateFloor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateFloorSchema.parse(req.body);
    const updated = await floorService.updateFloor(req.user!.userId, req.params.id, validatedData);
    return sendSuccess(res, updated, 'Floor updated successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};
