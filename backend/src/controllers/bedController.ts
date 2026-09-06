import { Request, Response, NextFunction } from 'express';
import { createBedSchema, updateBedSchema } from '../validators/hostelValidation';
import * as bedService from '../services/bedService';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';

export const createBed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createBedSchema.parse(req.body);
    const bed = await bedService.createBed(req.user!.userId, validatedData);
    return sendSuccess(res, bed, 'Bed created successfully.', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
};

export const getBedsByRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const beds = await bedService.getBedsByRoom(req.params.roomId);
    return sendSuccess(res, beds, 'Beds retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getAvailableBeds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostelId = req.query.hostelId as string | undefined;
    const roomId = req.query.roomId as string | undefined;
    const beds = await bedService.getAvailableBeds({ hostelId, roomId });
    return sendSuccess(res, beds, 'Available beds retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getOccupiedBeds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostelId = req.query.hostelId as string | undefined;
    const roomId = req.query.roomId as string | undefined;
    const beds = await bedService.getOccupiedBeds({ hostelId, roomId });
    return sendSuccess(res, beds, 'Occupied beds retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const updateBed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateBedSchema.parse(req.body);
    const updated = await bedService.updateBed(req.user!.userId, req.params.id, validatedData);
    return sendSuccess(res, updated, 'Bed updated successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};
