import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import env from '../config/env';

const generateToken = (id: string, role: string): string =>
  jwt.sign({ id, role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRE } as jwt.SignOptions);

// ── POST /api/auth/register ──────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, alertEmail } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'All fields required' });
      return;
    }

    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    const user  = await User.create({ name, email, password, alertEmail });
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

// ── POST /api/auth/login ─────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password required' });
      return;
    }

    const user = await User.findOne({ email }).select('+password');
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
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};

// ── GET /api/auth/me ─────────────────────────────────────────
export const getMe = async (req: Request & { user?: { id: string } }, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err });
  }
};
