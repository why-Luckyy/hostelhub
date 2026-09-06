import { Request, Response, NextFunction } from 'express';
import {
  createMessMenuSchema,
  updateMessMenuSchema,
  queryMessMenuSchema,
  createMessFeedbackSchema,
  queryMessFeedbackSchema,
  queryMealAnalyticsSchema,
} from '../validators/messValidation';
import * as messService from '../services/messService';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';

// ----------------------------------------------------
// MENU CONTROLLERS
// ----------------------------------------------------

export const getWeeklyMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryMessMenuSchema.parse(req.query);
    const result = await messService.getWeeklyMenu(query);
    return sendSuccess(res, result, 'Fetched weekly mess menu.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getTodayMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateStr = typeof req.query.date === 'string' ? req.query.date : undefined;
    const result = await messService.getTodayMenu(dateStr);
    return sendSuccess(res, result, "Fetched today's dining menu.", HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const createOrUpdateMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createMessMenuSchema.parse(req.body);
    const menu = await messService.createOrUpdateMenu(req.user!.userId, validatedData);
    return sendSuccess(res, menu, 'Mess menu entry configured successfully.', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
};

export const updateMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateMessMenuSchema.parse(req.body);
    const menu = await messService.updateMenu(req.user!.userId, req.params.id, validatedData);
    return sendSuccess(res, menu, 'Mess menu entry updated successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const deleteMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await messService.deleteMenu(req.user!.userId, req.params.id);
    return sendSuccess(res, result, 'Mess menu entry deleted successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

// ----------------------------------------------------
// FEEDBACK CONTROLLERS
// ----------------------------------------------------

export const createFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createMessFeedbackSchema.parse(req.body);
    const feedback = await messService.createFeedback(req.user!.userId, validatedData);
    return sendSuccess(res, feedback, 'Mess feedback submitted successfully.', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
};

export const getMyFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryMessFeedbackSchema.parse(req.query);
    const result = await messService.getMyFeedback(req.user!.userId, query);
    return sendSuccess(res, result.feedbacks, 'Fetched my mess feedback history.', HTTP_STATUS.OK, result.pagination);
  } catch (error) {
    return next(error);
  }
};

export const getAllFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryMessFeedbackSchema.parse(req.query);
    const result = await messService.getAllFeedback(query);
    return sendSuccess(res, result, 'Fetched all student mess feedback.', HTTP_STATUS.OK, result.pagination);
  } catch (error) {
    return next(error);
  }
};

// ----------------------------------------------------
// ANALYTICS & FORECAST CONTROLLERS
// ----------------------------------------------------

export const getExpectedMeals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryMealAnalyticsSchema.parse(req.query);
    const result = await messService.calculateExpectedMeals(query.date, query.mealType);
    return sendSuccess(res, result, 'Calculated expected meal counts.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getMessDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateStr = typeof req.query.date === 'string' ? req.query.date : undefined;
    const result = await messService.getMessDashboardAnalytics(dateStr);
    return sendSuccess(res, result, 'Fetched Mess Incharge dashboard analytics.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};
