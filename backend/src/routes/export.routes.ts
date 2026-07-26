import { Router } from 'express';
import { 
  exportZoneScansCSV, 
  exportAlertsCSV,
  getZoneExportStats,
  exportZoneHistoricalCSV,
  exportZoneFieldReportsCSV,
  exportAllHistoricalCSV,
  exportAllFieldReportsCSV
} from '../controllers/export.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

router.get('/zone/:id/csv',             exportZoneScansCSV);
router.get('/zone/:id/stats',           getZoneExportStats);
router.get('/zone/:id/historical/csv',  exportZoneHistoricalCSV);
router.get('/zone/:id/field/csv',       exportZoneFieldReportsCSV);

router.get('/alerts/csv',       exportAlertsCSV);
router.get('/historical/csv',   exportAllHistoricalCSV);
router.get('/field/csv',        exportAllFieldReportsCSV);

export default router;
