import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';
import * as presenceController from '../controllers/presenceController';

const router = Router();

// All presence endpoints require authentication
router.use(verifyToken);

// ----------------------------------------------------
// STUDENT ENDPOINTS (Both Hosteler and Day Scholar allowed)
// ----------------------------------------------------
router.post(
  '/verify',
  requireRole(ROLES.STUDENT),
  presenceController.verifyPresence
);

router.get(
  '/my-status',
  requireRole(ROLES.STUDENT),
  presenceController.getMyStatus
);

router.get(
  '/my-history',
  requireRole(ROLES.STUDENT),
  presenceController.getMyHistory
);

// ----------------------------------------------------
// SHARED (STUDENT + WARDEN) GEOFENCE INFO
// ----------------------------------------------------
router.get(
  '/geofence',
  requireRole(ROLES.STUDENT, ROLES.WARDEN),
  presenceController.getGeofence
);

// ----------------------------------------------------
// WARDEN ADMINISTRATIVE ENDPOINTS
// ----------------------------------------------------
router.get(
  '/summary',
  requireRole(ROLES.WARDEN),
  presenceController.getPresenceSummary
);

router.get(
  '/students',
  requireRole(ROLES.WARDEN),
  presenceController.getStudentsPresence
);

router.get(
  '/students/:studentProfileId',
  requireRole(ROLES.WARDEN),
  presenceController.getStudentPresenceHistory
);

router.post(
  '/geofence',
  requireRole(ROLES.WARDEN),
  presenceController.createGeofence
);

router.put(
  '/geofence/:id',
  requireRole(ROLES.WARDEN),
  presenceController.updateGeofence
);

export default router;
