import { Router } from 'express';
import * as floorController from '../controllers/floorController';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';

const router = Router();

// Warden Only: Infrastructure management
router.post('/', verifyToken, requireRole(ROLES.WARDEN), floorController.createFloor);
router.put('/:id', verifyToken, requireRole(ROLES.WARDEN), floorController.updateFloor);

// Authenticated users can view floors
router.get('/hostel/:hostelId', verifyToken, floorController.getFloorsByHostel);
router.get('/:id', verifyToken, floorController.getFloorById);

export default router;
