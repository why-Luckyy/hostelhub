import { Router } from 'express';
import * as hostelController from '../controllers/hostelController';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';

const router = Router();

// Warden Only: Create and update hostels
router.post('/', verifyToken, requireRole(ROLES.WARDEN), hostelController.createHostel);
router.put('/:id', verifyToken, requireRole(ROLES.WARDEN), hostelController.updateHostel);
router.get('/:id/occupancy', verifyToken, requireRole(ROLES.WARDEN), hostelController.getHostelOccupancy);

// Authenticated users can browse hostels
router.get('/', verifyToken, hostelController.getAllHostels);
router.get('/:id', verifyToken, hostelController.getHostelById);

export default router;
