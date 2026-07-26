import { Router } from 'express';
import { getAllUsers, getUser, updateUserRole, deleteUser, updateNotifyPrefs } from '../controllers/user.controller';
import { protect, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

// Admin only — User management
router.get('/',               requireRole('admin'), getAllUsers);
router.get('/:id',            requireRole('admin'), getUser);
router.put('/:id/role',       requireRole('admin'), updateUserRole);
router.delete('/:id',         requireRole('admin'), deleteUser);

// Any logged-in user — own notification prefs
router.put('/me/notify',      updateNotifyPrefs);

export default router;
