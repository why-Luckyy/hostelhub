import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';
import * as complaintController from '../controllers/complaintController';

const router = Router();

// All complaint endpoints require authentication
router.use(verifyToken);

// Student endpoints
router.post(
  '/',
  requireRole(ROLES.STUDENT),
  complaintController.createComplaint
);

router.get(
  '/my-complaints',
  requireRole(ROLES.STUDENT),
  complaintController.getMyComplaints
);

router.get(
  '/my-complaints/:id',
  requireRole(ROLES.STUDENT),
  complaintController.getMyComplaintById
);

// Warden endpoints
router.get(
  '/',
  requireRole(ROLES.WARDEN),
  complaintController.getAllComplaints
);

router.get(
  '/:id',
  requireRole(ROLES.WARDEN),
  complaintController.getComplaintById
);

router.patch(
  '/:id/resolve',
  requireRole(ROLES.WARDEN),
  complaintController.resolveComplaint
);

export default router;
