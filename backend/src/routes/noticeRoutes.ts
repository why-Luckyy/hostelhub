import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { ROLES } from '../constants/roles';
import * as noticeController from '../controllers/noticeController';

const router = Router();

// All notice endpoints require authentication
router.use(verifyToken);

// View notices (Student & Warden)
router.get(
  '/',
  requireRole(ROLES.STUDENT, ROLES.WARDEN),
  noticeController.getNotices
);

router.get(
  '/:id',
  requireRole(ROLES.STUDENT, ROLES.WARDEN),
  noticeController.getNoticeById
);

// Notice Management (Warden Only)
router.post(
  '/',
  requireRole(ROLES.WARDEN),
  noticeController.createNotice
);

router.put(
  '/:id',
  requireRole(ROLES.WARDEN),
  noticeController.updateNotice
);

router.delete(
  '/:id',
  requireRole(ROLES.WARDEN),
  noticeController.deleteNotice
);

export default router;
