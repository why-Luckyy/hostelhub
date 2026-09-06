import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';
import * as leaveController from '../controllers/leaveController';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// ----------------------------------------------------
// STUDENT ROUTES
// ----------------------------------------------------
router.post(
  '/',
  requireRole(ROLES.STUDENT),
  leaveController.createLeaveRequest
);

router.get(
  '/my-requests',
  requireRole(ROLES.STUDENT),
  leaveController.getMyLeaveRequests
);

router.post(
  '/:id/cancel',
  requireRole(ROLES.STUDENT),
  leaveController.cancelLeaveRequest
);

// ----------------------------------------------------
// WARDEN ROUTES
// ----------------------------------------------------
router.get(
  '/',
  requireRole(ROLES.WARDEN),
  leaveController.getAllLeaveRequests
);

router.patch(
  '/:id/review',
  requireRole(ROLES.WARDEN),
  leaveController.reviewLeaveRequest
);

// ----------------------------------------------------
// SHARED (STUDENT OWN / WARDEN)
// ----------------------------------------------------
router.get(
  '/:id',
  requireRole(ROLES.STUDENT, ROLES.WARDEN),
  leaveController.getLeaveRequestById
);

export default router;
