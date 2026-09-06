import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus';
import { sendSuccess } from '../utils/apiResponse';
import * as staffService from '../services/staffService';
import {
  createStaffSchema,
  updateStaffSchema,
  toggleStaffStatusSchema,
  checkInStaffSchema,
  checkOutStaffSchema,
  markAttendanceSchema,
  queryStaffAttendanceSchema,
} from '../validators/staffValidation';
import { MessStaffRole } from '@prisma/client';

export const createStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = createStaffSchema.parse(req.body);
    const staff = await staffService.createStaff(validatedData, req.user!.userId);
    return sendSuccess(
      res,
      staff,
      'Mess staff member registered successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    next(error);
  }
};

export const getAllStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const role = req.query.role as MessStaffRole | undefined;
    const isActive =
      req.query.isActive !== undefined
        ? req.query.isActive === 'true'
        : undefined;
    const search = req.query.search as string | undefined;

    const staffList = await staffService.getAllStaff({ role, isActive, search });
    return sendSuccess(res, staffList, 'Staff directory retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getStaffById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const staff = await staffService.getStaffById(req.params.id);
    return sendSuccess(res, staff, 'Staff details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = updateStaffSchema.parse(req.body);
    const updated = await staffService.updateStaff(
      req.params.id,
      validatedData,
      req.user!.userId
    );
    return sendSuccess(res, updated, 'Staff profile updated successfully');
  } catch (error) {
    next(error);
  }
};

export const toggleStaffStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { isActive } = toggleStaffStatusSchema.parse(req.body);
    const updated = await staffService.toggleStaffStatus(
      req.params.id,
      isActive,
      req.user!.userId
    );
    return sendSuccess(
      res,
      updated,
      `Staff member marked ${isActive ? 'active' : 'inactive'} successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const checkInStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = checkInStaffSchema.parse(req.body);
    const attendance = await staffService.checkInStaff(
      validatedData,
      req.user!.userId
    );
    return sendSuccess(
      res,
      attendance,
      `Staff checked in successfully (${attendance.status})`,
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    next(error);
  }
};

export const checkOutStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = checkOutStaffSchema.parse(req.body);
    const attendance = await staffService.checkOutStaff(
      validatedData,
      req.user!.userId
    );
    return sendSuccess(res, attendance, 'Staff checked out successfully');
  } catch (error) {
    next(error);
  }
};

export const markAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = markAttendanceSchema.parse(req.body);
    const attendance = await staffService.markAttendance(
      validatedData,
      req.user!.userId
    );
    return sendSuccess(
      res,
      attendance,
      `Staff attendance recorded as ${attendance.status}`,
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    next(error);
  }
};

export const getTodayRoster = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const dateStr = req.query.date as string | undefined;
    const roster = await staffService.getTodayRoster(dateStr);
    return sendSuccess(res, roster, 'Today staff roster retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getAttendanceSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const summary = await staffService.getAttendanceSummary(startDate, endDate);
    return sendSuccess(res, summary, 'Attendance summary metrics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getAttendanceHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedQuery = queryStaffAttendanceSchema.parse(req.query);
    const history = await staffService.getAttendanceHistory(validatedQuery);
    return sendSuccess(
      res,
      history.records,
      'Attendance history retrieved successfully',
      HTTP_STATUS.OK,
      history.meta
    );
  } catch (error) {
    next(error);
  }
};
