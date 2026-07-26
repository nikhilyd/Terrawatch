/**
 * User Management Controller (Admin Only)
 * -----------------------------------------
 * GET    /api/users          → All users list
 * GET    /api/users/:id      → Single user
 * PUT    /api/users/:id/role → Change user role
 * DELETE /api/users/:id      → Delete user
 * PUT    /api/users/me/notify → Update own notification prefs
 */

import { Request, Response } from 'express';
import User       from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';

// ── GET /api/users — All users (admin only) ──────────────────────────────────
export const getAllUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/users/:id ───────────────────────────────────────────────────────
export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── PUT /api/users/:id/role — Change role (admin only) ──────────────────────
export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'analyst', 'viewer', 'field'];

    if (!role || !validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles: ${validRoles.join(', ')}`,
      });
      return;
    }

    // Admin apna khud ka role change nahi kar sakta (safety)
    if (req.params.id === req.user?.id) {
      res.status(400).json({ success: false, message: 'Cannot change your own role' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    res.json({
      success: true,
      message: `Role updated to "${role}"`,
      data:    user,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── DELETE /api/users/:id (admin only) ───────────────────────────────────────
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.params.id === req.user?.id) {
      res.status(400).json({ success: false, message: 'Cannot delete yourself' });
      return;
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── PUT /api/users/me/notify — Update own notification prefs ─────────────────
export const updateNotifyPrefs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { critical, high, medium, low, digest } = req.body;

    const update: Record<string, boolean> = {};
    if (critical !== undefined) update['notifyOn.critical'] = critical;
    if (high     !== undefined) update['notifyOn.high']     = high;
    if (medium   !== undefined) update['notifyOn.medium']   = medium;
    if (low      !== undefined) update['notifyOn.low']      = low;
    if (digest   !== undefined) update['notifyOn.digest']   = digest;

    const user = await User.findByIdAndUpdate(req.user?.id, update, { new: true }).select('-password');
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};
