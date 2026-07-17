import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  saveAnalysis,
  getAnalyses,
  getAnalysis,
  getAnalysesByZone,
  deleteAnalysis,
} from '../controllers/historical.controller';

const router = Router();

// All routes require auth
router.use(protect);

router.post('/',                    saveAnalysis);       // Save new analysis
router.get('/',                     getAnalyses);        // List all for user
router.get('/zone/:zoneId',         getAnalysesByZone);  // By zone
router.get('/:id',                  getAnalysis);        // Full detail
router.delete('/:id',               deleteAnalysis);     // Delete

export default router;
