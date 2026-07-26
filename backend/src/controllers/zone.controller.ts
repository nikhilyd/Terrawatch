import { Response } from 'express';
import Zone from '../models/Zone';
import { AuthRequest } from '../middleware/auth.middleware';
import { broadcastZoneUpdate } from '../utils/socket';

// POST /api/zones
export const createZone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.create({ ...req.body, createdBy: req.user?.id });
    broadcastZoneUpdate(zone, 'created');
    res.status(201).json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// GET /api/zones
export const getZones = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zones = await Zone.find({ isActive: true, createdBy: req.user?.id }).populate('createdBy', 'name email');
    res.json({ success: true, count: zones.length, data: zones });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// GET /api/zones/:id
export const getZone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }
    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// PUT /api/zones/:id
export const updateZone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }
    broadcastZoneUpdate(zone, 'updated');
    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// DELETE /api/zones/:id
export const deleteZone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }
    broadcastZoneUpdate(zone, 'deleted');
    res.json({ success: true, message: 'Zone deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};
