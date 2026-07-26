"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = __importDefault(require("../config/env"));
// ── Protect: JWT verify ───────────────────────────────────────────────────────
const protect = async (req, res, next) => {
    const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null;
    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized — token missing' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.default.JWT_SECRET);
        req.user = { id: decoded.id, role: decoded.role };
        next();
    }
    catch {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};
exports.protect = protect;
// ── Role Guard: specific roles allow karo ────────────────────────────────────
// Usage: router.delete('/:id', protect, requireRole('admin'), deleteZone)
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({
            success: false,
            message: `Access denied. Required: [${roles.join(' | ')}] | Your role: ${req.user?.role ?? 'none'}`,
        });
        return;
    }
    next();
};
exports.requireRole = requireRole;
// ── Role Reference ────────────────────────────────────────────────────────────
// admin   → Full access: zones CRUD, scans, alerts, reports, user management
// analyst → Scans trigger, view all data, generate reports (no user management)
// viewer  → Read-only: view zones, scans, alerts, public data
// field   → Field reports submit only + view own zone data
//# sourceMappingURL=auth.middleware.js.map