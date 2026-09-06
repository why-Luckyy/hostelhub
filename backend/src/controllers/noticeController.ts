import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus';
import {
  createNoticeSchema,
  updateNoticeSchema,
  queryNoticesSchema,
} from '../validators/noticeValidation';
import * as noticeService from '../services/noticeService';

export const getNotices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryNoticesSchema.parse(req.query);
    const result = await noticeService.getNotices(req.user!.role, req.user!.userId, query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Notices retrieved successfully.',
      data: result.notices,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getNoticeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await noticeService.getNoticeById(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Notice retrieved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createNoticeSchema.parse(req.body);
    const result = await noticeService.createNotice(req.user!.userId, input);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Notice published successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateNoticeSchema.parse(req.body);
    const result = await noticeService.updateNotice(req.user!.userId, req.params.id, input);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Notice updated successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await noticeService.deleteNotice(req.user!.userId, req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
