import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: UserRole;
    };
}
export declare const protect: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (...roles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map