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
router.get(
  '/my-passes',
  requireRole(ROLES.STUDENT),
  guestController.getMyGuestPasses
);

// ----------------------------------------------------
// WARDEN ROUTES
// ----------------------------------------------------
router.get(
  '/',
  requireRole(ROLES.WARDEN),
  guestController.getAllGuestPasses
);

// ----------------------------------------------------
// SHARED (STUDENT OWN / WARDEN)
// ----------------------------------------------------
router.get(
  '/:id',
  requireRole(ROLES.STUDENT, ROLES.WARDEN),
  guestController.getGuestPassById
);

export default router;
