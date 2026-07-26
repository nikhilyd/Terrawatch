import { Router } from 'express';
import multer from 'multer';
import path   from 'path';
import { submitFieldReport, getFieldReports } from '../controllers/field.controller';
import { protect } from '../middleware/auth.middleware';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/field/'),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `field_${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits:      { fileSize: 10 * 1024 * 1024 },    // 10MB max
  fileFilter:  (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    cb(null, allowed.test(file.mimetype));
  },
});

const router = Router();
router.use(protect);

router.post('/report',    upload.single('photo'), submitFieldReport);
router.get('/reports',    getFieldReports);         // ?zone=<id>

export default router;
