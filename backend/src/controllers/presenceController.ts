import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus';
import {
  verifyPresenceSchema,
  createGeofenceSchema,
  updateGeofenceSchema,
  queryPresenceSchema,
} from '../validators/presenceValidation';
import * as presenceService from '../services/presenceService';

export const verifyPresence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = verifyPresenceSchema.parse(req.body);
    const result = await presenceService.verifyPresence(req.user!.userId, input);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: result.isInside
        ? 'Verified: You are currently INSIDE the university campus.'
        : 'Verified: You are currently OUTSIDE the university campus.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await presenceService.getMyStatus(req.user!.userId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Current campus presence status retrieved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await presenceService.getMyHistory(req.user!.userId, { page, limit });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Campus presence history retrieved successfully.',
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getGeofence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await presenceService.getActiveGeofence();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Active campus geofence configuration retrieved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPresenceSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await presenceService.getPresenceSummary();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Campus presence overview summary retrieved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentsPresence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryPresenceSchema.parse(req.query);
    const result = await presenceService.getStudentsPresence(query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Students campus presence records retrieved successfully.',
      data: result.students,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentPresenceHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await presenceService.getStudentPresenceHistory(
      req.params.studentProfileId,
      { page, limit }
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Student presence history retrieved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createGeofence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createGeofenceSchema.parse(req.body);
    const result = await presenceService.createGeofence(req.user!.userId, input);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Campus geofence created and activated successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateGeofence = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateGeofenceSchema.parse(req.body);
    const result = await presenceService.updateGeofence(
      req.user!.userId,
      req.params.id,
      input
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Campus geofence updated successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
