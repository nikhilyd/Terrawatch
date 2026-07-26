import { Router } from 'express';
import { triggerScan, triggerAllScans, getScansByZone, getScan, compareScans, getAllScans, retryScan } from '../controllers/scan.controller';
import { protect, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

router.get('/',                   getAllScans);                                    // viewer+
router.get('/zone/:id',           getScansByZone);                                // viewer+
router.get('/compare/:id1/:id2',  compareScans);                                  // viewer+
router.get('/:id',                getScan);                                       // viewer+
router.post('/trigger',           requireRole('admin', 'analyst'), triggerScan);  // admin, analyst only
router.post('/trigger-all',       requireRole('admin', 'analyst'), triggerAllScans); // batch scan
router.post('/:id/retry',         requireRole('admin', 'analyst'), retryScan);    // retry failed scan

export default router;
