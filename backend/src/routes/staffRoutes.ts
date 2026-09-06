import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';
import * as staffController from '../controllers/staffController';

const router = Router();

// Authentication required for all staff routes
router.use(verifyToken);

// ============================================================================
// ATTENDANCE ROUTES
// (Must be defined before parameterized /:id routes to avoid route shadowing)
// ============================================================================

// Operational check-in: Mess Incharge only
router.post(
  '/attendance/check-in',
  requireRole(ROLES.MESS_INCHARGE),
  staffController.checkInStaff
);

// Operational check-out: Mess Incharge only
router.post(
  '/attendance/check-out',
  requireRole(ROLES.MESS_INCHARGE),
  staffController.checkOutStaff
);

// Explicit attendance mark (Absent / Half Day / Override): Mess Incharge only
router.post(
  '/attendance/mark',
  requireRole(ROLES.MESS_INCHARGE),
  staffController.markAttendance
);

// Today's active roster: Mess Incharge & Warden (Read-Only for Warden)
router.get(
  '/attendance/today',
  requireRole(ROLES.MESS_INCHARGE, ROLES.WARDEN),
  staffController.getTodayRoster
);

// Aggregate attendance summary: Mess Incharge & Warden
router.get(
  '/attendance/summary',
  requireRole(ROLES.MESS_INCHARGE, ROLES.WARDEN),
  staffController.getAttendanceSummary
);

// Paginated historical attendance: Mess Incharge & Warden
router.get(
  '/attendance/history',
  requireRole(ROLES.MESS_INCHARGE, ROLES.WARDEN),
  staffController.getAttendanceHistory
);

// ============================================================================
// STAFF MANAGEMENT ROUTES
// ============================================================================

// Register new staff: Mess Incharge only
router.post(
  '/',
  requireRole(ROLES.MESS_INCHARGE),
  staffController.createStaff
);

// List all staff members: Mess Incharge & Warden
router.get(
  '/',
  requireRole(ROLES.MESS_INCHARGE, ROLES.WARDEN),
  staffController.getAllStaff
);

// Get staff member by ID: Mess Incharge & Warden
router.get(
  '/:id',
  requireRole(ROLES.MESS_INCHARGE, ROLES.WARDEN),
  staffController.getStaffById
);

// Update staff profile: Mess Incharge only
router.put(
  '/:id',
  requireRole(ROLES.MESS_INCHARGE),
  staffController.updateStaff
);

// Toggle active status: Mess Incharge only
router.patch(
  '/:id/status',
  requireRole(ROLES.MESS_INCHARGE),
  staffController.toggleStaffStatus
);

export default router;
