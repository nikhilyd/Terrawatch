import { Router } from 'express';
import { getPublicStats, getPublicZones, getPublicAlerts } from '../controllers/public.controller';

const router = Router();
// NO auth — public access!

router.get('/stats',   getPublicStats);    // Global deforestation dashboard
router.get('/zones',   getPublicZones);    // Zone list (no sensitive data)
router.get('/alerts',  getPublicAlerts);   // Recent HIGH/CRITICAL alerts feed

export default router;
