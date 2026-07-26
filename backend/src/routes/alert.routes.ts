import { Router } from 'express';
import { getAlerts, getAlertsByZone, markRead, getStats, updateAlertStatus } from '../controllers/alert.controller';
import { protect, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/',          getAlerts);
router.get('/stats',     getStats);
router.get('/zone/:id',  getAlertsByZone);
router.put('/:id/read',  markRead);
router.put('/:id/status', updateAlertStatus);

export default router;
