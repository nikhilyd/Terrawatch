import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getAlerts: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAlertsByZone: (req: AuthRequest, res: Response) => Promise<void>;
export declare const markRead: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getStats: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateAlertStatus: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=alert.controller.d.ts.map