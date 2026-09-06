import { Router } from 'express';
import * as allocationController from '../controllers/allocationController';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';

const router = Router();

// Student Only: View own active hostel/bed allocation
router.get('/my-allocation', verifyToken, requireRole(ROLES.STUDENT), allocationController.getMyAllocation);

// Warden Only: Allocate, Vacate, Transfer, and Audit Query
router.post('/', verifyToken, requireRole(ROLES.WARDEN), allocationController.allocateBed);
router.post('/vacate', verifyToken, requireRole(ROLES.WARDEN), allocationController.vacateBed);
router.post('/:id/vacate', verifyToken, requireRole(ROLES.WARDEN), allocationController.vacateBed);
router.post('/transfer', verifyToken, requireRole(ROLES.WARDEN), allocationController.transferBed);
router.get('/', verifyToken, requireRole(ROLES.WARDEN), allocationController.getAllocations);

export default router;
