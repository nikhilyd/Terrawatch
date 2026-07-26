import { Router } from 'express';
import {
  getCarbonLoss,
  getZoneRiskScore,
  getAllRiskScores,
  downloadFIRReport,
} from '../controllers/legal.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

// Feature 1: Carbon Loss Calculator
router.get('/zone/:id/carbon',   getCarbonLoss);      // GET → CO₂ + economic damage

// Feature 2: FIR Legal Evidence Report
router.get('/zone/:id/fir',      downloadFIRReport);  // GET → PDF download

// Feature 3: Zone Risk Score
router.get('/zone/:id/risk',     getZoneRiskScore);   // GET → Single zone risk
router.get('/risk-scores',       getAllRiskScores);   // GET → All zones ranked

export default router;
