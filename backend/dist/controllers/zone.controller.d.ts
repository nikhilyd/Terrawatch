import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const createZone: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getZones: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getZone: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateZone: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteZone: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=zone.controller.d.ts.map