/**
 * Historical Analysis Controller
 * --------------------------------
 * Save, list, fetch, and delete historical analysis records.
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const saveAnalysis: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAnalyses: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAnalysis: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAnalysesByZone: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteAnalysis: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=historical.controller.d.ts.map