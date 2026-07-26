import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const triggerScan: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllScans: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getScansByZone: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getScan: (req: AuthRequest, res: Response) => Promise<void>;
export declare const compareScans: (req: AuthRequest, res: Response) => Promise<void>;
export declare const retryScan: (req: AuthRequest, res: Response) => Promise<void>;
export declare const triggerAllScans: (_req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=scan.controller.d.ts.map