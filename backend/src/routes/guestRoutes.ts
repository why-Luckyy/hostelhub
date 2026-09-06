import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';
import * as guestController from '../controllers/guestController';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// ----------------------------------------------------
// STUDENT ROUTES
// ----------------------------------------------------
router.post(
  '/',
  requireRole(ROLES.STUDENT),
  guestController.createGuestRequest
);

router.get(
  '/my-requests',
  requireRole(ROLES.STUDENT),
  guestController.getMyGuestRequests
);

// ----------------------------------------------------
// WARDEN ROUTES
// ----------------------------------------------------
router.get(
  '/',
  requireRole(ROLES.WARDEN),
  guestController.getAllGuestRequests
);

router.patch(
  '/:id/review',
  requireRole(ROLES.WARDEN),
  guestController.reviewGuestRequest
);

// ----------------------------------------------------
// SHARED (STUDENT OWN / WARDEN)
// ----------------------------------------------------
router.get(
  '/:id',
  requireRole(ROLES.STUDENT, ROLES.WARDEN),
  guestController.getGuestRequestById
);

export default router;
