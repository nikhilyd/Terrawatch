import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  createCampaign,
  getCampaigns,
  getCampaign,
  togglePause,
  deleteCampaign,
  previewDates,
} from '../controllers/campaign.controller';

const router = Router();

// All routes require auth
router.use(protect);

// Preview utility (no DB write)
router.post('/preview-dates', previewDates);

// CRUD
router.post('/',                createCampaign);
router.get('/',                 getCampaigns);
router.get('/:id',              getCampaign);
router.patch('/:id/pause',      togglePause);
router.delete('/:id',           deleteCampaign);

export default router;
