import { Request, Response, NextFunction } from 'express';
import { createHostelSchema, updateHostelSchema } from '../validators/hostelValidation';
import * as hostelService from '../services/hostelService';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';
import { GenderAllowed } from '@prisma/client';

export const createHostel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createHostelSchema.parse(req.body);
    const hostel = await hostelService.createHostel(req.user!.userId, validatedData);
    return sendSuccess(res, hostel, 'Hostel created successfully.', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
};

export const getAllHostels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const genderAllowed = req.query.genderAllowed as GenderAllowed | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const hostels = await hostelService.getAllHostels({ genderAllowed, isActive });
    return sendSuccess(res, hostels, 'Hostels retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getHostelById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hostel = await hostelService.getHostelById(req.params.id);
    return sendSuccess(res, hostel, 'Hostel retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const updateHostel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateHostelSchema.parse(req.body);
    const updated = await hostelService.updateHostel(req.user!.userId, req.params.id, validatedData);
    return sendSuccess(res, updated, 'Hostel updated successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getHostelOccupancy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const occupancy = await hostelService.getHostelOccupancy(req.params.id);
    return sendSuccess(res, occupancy, 'Hostel occupancy retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};
