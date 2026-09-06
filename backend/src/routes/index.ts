import { Router } from 'express';
import healthRoute from './healthRoute';

import authRoutes from './authRoutes';
import hostelRoutes from './hostelRoutes';
import floorRoutes from './floorRoutes';
import roomRoutes from './roomRoutes';
import bedRoutes from './bedRoutes';
import allocationRoutes from './allocationRoutes';
import leaveRoutes from './leaveRoutes';
import guestRoutes from './guestRoutes';
import guestPassRoutes from './guestPassRoutes';
import messRoutes from './messRoutes';
import staffRoutes from './staffRoutes';
import complaintRoutes from './complaintRoutes';
import noticeRoutes from './noticeRoutes';
import fineRoutes from './fineRoutes';
import presenceRoutes from './presenceRoutes';

const router = Router();

// Base /api/v1 routes
router.use('/health', healthRoute);
router.use('/auth', authRoutes);
router.use('/hostels', hostelRoutes);
router.use('/floors', floorRoutes);
router.use('/rooms', roomRoutes);
router.use('/beds', bedRoutes);
router.use('/allocations', allocationRoutes);
router.use('/leave-requests', leaveRoutes);
router.use('/guest-requests', guestRoutes);
router.use('/guest-passes', guestPassRoutes);
router.use('/mess/staff', staffRoutes);
router.use('/mess', messRoutes);
router.use('/complaints', complaintRoutes);
router.use('/notices', noticeRoutes);
router.use('/fines', fineRoutes);
router.use('/presence', presenceRoutes);

export default router;
