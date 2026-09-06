import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';
import * as fineController from '../controllers/fineController';

const router = Router();

// All fine endpoints require authentication
router.use(verifyToken);

// Student endpoints
router.get(
  '/my-fines',
  requireRole(ROLES.STUDENT),
  fineController.getMyFines
);

router.get(
  '/my-fines/:id',
  requireRole(ROLES.STUDENT),
  fineController.getMyFineById
);

// Warden endpoints
router.post(
  '/',
  requireRole(ROLES.WARDEN),
  fineController.assignFine
);

router.get(
  '/',
  requireRole(ROLES.WARDEN),
  fineController.getAllFines
);

router.get(
  '/:id',
  requireRole(ROLES.WARDEN),
  fineController.getFineById
);

router.patch(
  '/:id/status',
  requireRole(ROLES.WARDEN),
  fineController.updateFineStatus
);

export default router;
