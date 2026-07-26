import { Request, Response, NextFunction } from 'express';
import jwt  from 'jsonwebtoken';
import env  from '../config/env';
import User, { UserRole } from '../models/User';

export interface AuthRequest extends Request {
  user?: { id: string; role: UserRole };
}

// ── Protect: JWT verify ───────────────────────────────────────────────────────
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized — token missing' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role: UserRole };
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ── Role Guard: specific roles allow karo ────────────────────────────────────
// Usage: router.delete('/:id', protect, requireRole('admin'), deleteZone)
export const requireRole = (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required: [${roles.join(' | ')}] | Your role: ${req.user?.role ?? 'none'}`,
      });
      return;
    }
    next();
  };

// ── Role Reference ────────────────────────────────────────────────────────────
// admin   → Full access: zones CRUD, scans, alerts, reports, user management
// analyst → Scans trigger, view all data, generate reports (no user management)
// viewer  → Read-only: view zones, scans, alerts, public data
// field   → Field reports submit only + view own zone data
