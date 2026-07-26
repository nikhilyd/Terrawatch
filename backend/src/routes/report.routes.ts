import { Router } from 'express';
import { downloadZoneReport, emailZoneReport, getForestTrend } from '../controllers/report.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

// Feature 1: PDF Download
router.get('/zone/:id',           downloadZoneReport);   // GET → PDF download

// Feature 2: Email Report
router.post('/zone/:id/email',    emailZoneReport);       // POST { toEmail } → email bhejo

// Feature 3: Forest Trend Data (for charts)
router.get('/zone/:id/trend',     getForestTrend);        // GET → JSON trend data

export default router;
