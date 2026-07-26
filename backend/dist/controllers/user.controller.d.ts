/**
 * User Management Controller (Admin Only)
 * -----------------------------------------
 * GET    /api/users          → All users list
 * GET    /api/users/:id      → Single user
 * PUT    /api/users/:id/role → Change user role
 * DELETE /api/users/:id      → Delete user
 * PUT    /api/users/me/notify → Update own notification prefs
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getAllUsers: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateUserRole: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateNotifyPrefs: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=user.controller.d.ts.map