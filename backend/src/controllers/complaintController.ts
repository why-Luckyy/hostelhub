import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus';
import {
  createComplaintSchema,
  resolveComplaintSchema,
  queryComplaintsSchema,
} from '../validators/complaintValidation';
import * as complaintService from '../services/complaintService';

export const createComplaint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createComplaintSchema.parse(req.body);
    const result = await complaintService.createComplaint(req.user!.userId, input);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Complaint submitted successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyComplaints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryComplaintsSchema.parse(req.query);
    const result = await complaintService.getMyComplaints(req.user!.userId, query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Complaints retrieved successfully.',
      data: result.complaints,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyComplaintById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await complaintService.getMyComplaintById(req.user!.userId, req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Complaint retrieved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllComplaints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = queryComplaintsSchema.parse(req.query);
    const result = await complaintService.getAllComplaints(query);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'All complaints retrieved successfully.',
      data: result.complaints,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getComplaintById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await complaintService.getComplaintById(req.params.id);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Complaint details retrieved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const resolveComplaint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = resolveComplaintSchema.parse(req.body);
    const result = await complaintService.resolveComplaint(
      req.user!.userId,
      req.params.id,
      input
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Complaint marked as solved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
