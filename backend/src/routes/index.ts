import { Router } from 'express';
import healthRoute from './healthRoute';

const router = Router();

// Base /api/v1 routes
router.use('/health', healthRoute);

// Future Phase Modules will be mounted here:
// router.use('/auth', authRoutes);
// router.use('/students', studentRoutes);
// router.use('/hostels', hostelRoutes);
// router.use('/complaints', complaintRoutes);
// router.use('/leaves', leaveRoutes);
// router.use('/guests', guestRoutes);
// router.use('/mess', messRoutes);
// router.use('/notices', noticeRoutes);
// router.use('/presence', presenceRoutes);

export default router;
