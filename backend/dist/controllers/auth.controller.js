"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const env_1 = __importDefault(require("../config/env"));
const generateToken = (id, role) => jsonwebtoken_1.default.sign({ id, role }, env_1.default.JWT_SECRET, { expiresIn: env_1.default.JWT_EXPIRE });
// ── POST /api/auth/register ──────────────────────────────────
const register = async (req, res) => {
    try {
        const { name, email, password, alertEmail } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: 'All fields required' });
            return;
        }
        const exists = await User_1.default.findOne({ email });
        if (exists) {
            res.status(400).json({ success: false, message: 'Email already registered' });
            return;
        }
        const user = await User_1.default.create({ name, email, password, alertEmail });
        const token = generateToken(user.id, user.role);
        res.status(201).json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.register = register;
// ── POST /api/auth/login ─────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password required' });
            return;
        }
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        const token = generateToken(user.id, user.role);
        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.login = login;
// ── GET /api/auth/me ─────────────────────────────────────────
const getMe = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user?.id).select('-password');
        res.json({ success: true, user });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err });
    }
};
exports.getMe = getMe;
//# sourceMappingURL=auth.controller.js.map