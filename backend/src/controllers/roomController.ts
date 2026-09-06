import { Request, Response, NextFunction } from 'express';
import { createRoomSchema, updateRoomSchema } from '../validators/hostelValidation';
import * as roomService from '../services/roomService';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants/httpStatus';
import { RoomType } from '@prisma/client';

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createRoomSchema.parse(req.body);
    const room = await roomService.createRoom(req.user!.userId, validatedData);
    return sendSuccess(res, room, 'Room created with initial beds successfully.', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
};

export const getRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const floorId = req.query.floorId as string | undefined;
    const hostelId = req.query.hostelId as string | undefined;
    const roomType = req.query.roomType as RoomType | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const hasAvailableBeds = req.query.hasAvailableBeds !== undefined ? req.query.hasAvailableBeds === 'true' : undefined;

    const rooms = await roomService.getRooms({
      floorId,
      hostelId,
      roomType,
      isActive,
      hasAvailableBeds,
    });
    return sendSuccess(res, rooms, 'Rooms retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const getRoomById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    return sendSuccess(res, room, 'Room details retrieved successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateRoomSchema.parse(req.body);
    const updated = await roomService.updateRoom(req.user!.userId, req.params.id, validatedData);
    return sendSuccess(res, updated, 'Room updated successfully.', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
};
