import { Router } from 'express';
import * as authController from '../controllers/authController';
import { verifyToken } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/rbacMiddleware';
import { authLimiter } from '../middlewares/rateLimiter';
import { ROLES } from '../constants/roles';

const router = Router();

// Public Authentication Endpoints (Rate Limited)
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);

// Protected User Endpoints (Requires valid JWT)
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', verifyToken, authController.logout);
router.patch('/change-password', verifyToken, authController.updatePassword);

// Role-Based Access Control Verification Endpoints
router.get('/test/student-role', verifyToken, requireRole(ROLES.STUDENT), (_req, res) => {
  res.json({ success: true, message: 'Student access granted' });
});

router.get('/test/warden-role', verifyToken, requireRole(ROLES.WARDEN), (_req, res) => {
  res.json({ success: true, message: 'Warden access granted' });
});

router.get('/test/mess-role', verifyToken, requireRole(ROLES.MESS_INCHARGE), (_req, res) => {
  res.json({ success: true, message: 'Mess access granted' });
});

export default router;
