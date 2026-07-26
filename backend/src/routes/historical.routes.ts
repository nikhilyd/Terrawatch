import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  saveAnalysis,
  getAnalyses,
  getAnalysis,
  getAnalysesByZone,
  deleteAnalysis,
} from '../controllers/historical.controller';
import { analyzeHistorical } from '../controllers/historicalAnalyze.controller';

const router = Router();

// Public route — historical analysis (called by frontend directly)
router.post('/analyze', analyzeHistorical);

// All other routes require auth
router.use(protect);

router.post('/', saveAnalysis);       // Save new analysis
router.get('/', getAnalyses);        // List all for user
router.get('/zone/:zoneId', getAnalysesByZone);  // By zone
router.get('/:id', getAnalysis);        // Full detail
router.delete('/:id', deleteAnalysis);     // Delete

export default router;
