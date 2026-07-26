"use strict";
/**
 * User Management Controller (Admin Only)
 * -----------------------------------------
 * GET    /api/users          → All users list
 * GET    /api/users/:id      → Single user
 * PUT    /api/users/:id/role → Change user role
 * DELETE /api/users/:id      → Delete user
 * PUT    /api/users/me/notify → Update own notification prefs
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotifyPrefs = exports.deleteUser = exports.updateUserRole = exports.getUser = exports.getAllUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
// ── GET /api/users — All users (admin only) ──────────────────────────────────
const getAllUsers = async (_req, res) => {
    try {
        const users = await User_1.default.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, count: users.length, data: users });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getAllUsers = getAllUsers;
// ── GET /api/users/:id ───────────────────────────────────────────────────────
const getUser = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id).select('-password');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getUser = getUser;
// ── PUT /api/users/:id/role — Change role (admin only) ──────────────────────
const updateUserRole = async (req, res) => {
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
        const user = await User_1.default.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({
            success: true,
            message: `Role updated to "${role}"`,
            data: user,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.updateUserRole = updateUserRole;
// ── DELETE /api/users/:id (admin only) ───────────────────────────────────────
const deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.user?.id) {
            res.status(400).json({ success: false, message: 'Cannot delete yourself' });
            return;
        }
        const user = await User_1.default.findByIdAndDelete(req.params.id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, message: 'User deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.deleteUser = deleteUser;
// ── PUT /api/users/me/notify — Update own notification prefs ─────────────────
const updateNotifyPrefs = async (req, res) => {
    try {
        const { critical, high, medium, low, digest } = req.body;
        const update = {};
        if (critical !== undefined)
            update['notifyOn.critical'] = critical;
        if (high !== undefined)
            update['notifyOn.high'] = high;
        if (medium !== undefined)
            update['notifyOn.medium'] = medium;
        if (low !== undefined)
            update['notifyOn.low'] = low;
        if (digest !== undefined)
            update['notifyOn.digest'] = digest;
        const user = await User_1.default.findByIdAndUpdate(req.user?.id, update, { new: true }).select('-password');
        res.json({ success: true, data: user });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.updateNotifyPrefs = updateNotifyPrefs;
//# sourceMappingURL=user.controller.js.map