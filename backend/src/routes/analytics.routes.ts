import { Router } from 'express';
import { getThreatDistribution, getAlertsOverTime, getThreatTypeBreakdown } from '../controllers/analytics.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

router.get('/threat-distribution', getThreatDistribution);
router.get('/alerts-over-time',    getAlertsOverTime);
router.get('/threat-types',        getThreatTypeBreakdown);

export default router;
