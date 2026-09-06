import { Router } from 'express';
import healthRoute from './healthRoute';

import authRoutes from './authRoutes';
import hostelRoutes from './hostelRoutes';
import floorRoutes from './floorRoutes';
import roomRoutes from './roomRoutes';
import bedRoutes from './bedRoutes';
import allocationRoutes from './allocationRoutes';

const router = Router();

// Base /api/v1 routes
router.use('/health', healthRoute);
router.use('/auth', authRoutes);
router.use('/hostels', hostelRoutes);
router.use('/floors', floorRoutes);
router.use('/rooms', roomRoutes);
router.use('/beds', bedRoutes);
router.use('/allocations', allocationRoutes);

export default router;
