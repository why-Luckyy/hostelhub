import { Router } from 'express';
import * as roomController from '../controllers/roomController';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';

const router = Router();

// Warden Only: Create and update rooms
router.post('/', verifyToken, requireRole(ROLES.WARDEN), roomController.createRoom);
router.put('/:id', verifyToken, requireRole(ROLES.WARDEN), roomController.updateRoom);

// Authenticated users can view rooms
router.get('/', verifyToken, roomController.getRooms);
router.get('/:id', verifyToken, roomController.getRoomById);

export default router;
