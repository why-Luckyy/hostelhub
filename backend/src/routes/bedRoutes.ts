import { Router } from 'express';
import * as bedController from '../controllers/bedController';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';

const router = Router();

// Warden Only: Define and manage physical beds and availability
router.post('/', verifyToken, requireRole(ROLES.WARDEN), bedController.createBed);
router.put('/:id', verifyToken, requireRole(ROLES.WARDEN), bedController.updateBed);
router.get('/available', verifyToken, requireRole(ROLES.WARDEN), bedController.getAvailableBeds);
router.get('/occupied', verifyToken, requireRole(ROLES.WARDEN), bedController.getOccupiedBeds);

// Authenticated users can view beds in a room
router.get('/room/:roomId', verifyToken, bedController.getBedsByRoom);

export default router;
