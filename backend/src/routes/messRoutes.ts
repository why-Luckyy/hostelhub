import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';
import * as messController from '../controllers/messController';

const router = Router();

// All mess routes require authentication
router.use(verifyToken);

// ----------------------------------------------------
// MENU ROUTES
// ----------------------------------------------------

// View menu: Students, Wardens, Mess Incharge
router.get(
  '/menu',
  requireRole(ROLES.STUDENT, ROLES.WARDEN, ROLES.MESS_INCHARGE),
  messController.getWeeklyMenu
);

router.get(
  '/menu/today',
  requireRole(ROLES.STUDENT, ROLES.WARDEN, ROLES.MESS_INCHARGE),
  messController.getTodayMenu
);

// Manage menu: Restricted to MESS_INCHARGE only
router.post(
  '/menu',
  requireRole(ROLES.MESS_INCHARGE),
  messController.createOrUpdateMenu
);

router.put(
  '/menu/:id',
  requireRole(ROLES.MESS_INCHARGE),
  messController.updateMenu
);

router.delete(
  '/menu/:id',
  requireRole(ROLES.MESS_INCHARGE),
  messController.deleteMenu
);

// ----------------------------------------------------
// FEEDBACK ROUTES
// ----------------------------------------------------

// Submit & view personal feedback: Students only
router.post(
  '/feedback',
  requireRole(ROLES.STUDENT),
  messController.createFeedback
);

router.get(
  '/feedback/my-feedback',
  requireRole(ROLES.STUDENT),
  messController.getMyFeedback
);

// Review all feedback: Mess Incharge & Warden
router.get(
  '/feedback',
  requireRole(ROLES.MESS_INCHARGE, ROLES.WARDEN),
  messController.getAllFeedback
);

// ----------------------------------------------------
// ANALYTICS & FORECAST ROUTES
// ----------------------------------------------------

// Programmatic expected meal calculations: Mess Incharge & Warden
router.get(
  '/analytics/expected-meals',
  requireRole(ROLES.MESS_INCHARGE, ROLES.WARDEN),
  messController.getExpectedMeals
);

// Comprehensive mess dashboard: Mess Incharge & Warden
router.get(
  '/analytics/dashboard',
  requireRole(ROLES.MESS_INCHARGE, ROLES.WARDEN),
  messController.getMessDashboard
);

export default router;
