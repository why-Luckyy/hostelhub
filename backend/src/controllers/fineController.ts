import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus';
import {
  createFineSchema,
  updateFineStatusSchema,
  queryFinesSchema,
} from '../validators/fineValidation';
import * as fineService from '../services/fineService';

export const assignFine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createFineSchema.parse(req.body);
    const result = await fineService.assignFine(req.user!.userId, input);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Fine assigned to student successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyFines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryFinesSchema.parse(req.query);
    const result = await fineService.getMyFines(req.user!.userId, query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Student fines retrieved successfully.',
      data: result.fines,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyFineById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await fineService.getMyFineById(req.user!.userId, req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Fine record retrieved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllFines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryFinesSchema.parse(req.query);
    const result = await fineService.getAllFines(query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'All fines retrieved successfully.',
      data: result.fines,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getFineById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await fineService.getFineById(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Fine record retrieved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFineStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateFineStatusSchema.parse(req.body);
    const result = await fineService.updateFineStatus(req.user!.userId, req.params.id, input);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Fine status updated to PAID successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
