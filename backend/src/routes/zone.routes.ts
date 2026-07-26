import { Router } from 'express';
import { createZone, getZones, getZone, updateZone, deleteZone } from '../controllers/zone.controller';
import { protect, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

router.get('/',     getZones);                                    // viewer+
router.get('/:id',  getZone);                                     // viewer+
router.post('/',    requireRole('admin', 'analyst'), createZone); // admin, analyst only
router.put('/:id',  requireRole('admin', 'analyst'), updateZone); // admin, analyst only
router.delete('/:id', requireRole('admin'),          deleteZone); // admin only

export default router;
