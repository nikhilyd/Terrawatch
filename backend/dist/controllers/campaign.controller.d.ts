/**
 * Campaign Controller
 * -------------------
 * Monitoring Campaign ke liye CRUD + preview-dates utility
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const calculateScanDates: (startDate: Date, endDate: Date, count: number) => Date[];
export declare const calculateAreaKm2: (bbox: number[]) => number;
export declare const previewDates: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createCampaign: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCampaigns: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCampaign: (req: AuthRequest, res: Response) => Promise<void>;
export declare const togglePause: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteCampaign: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=campaign.controller.d.ts.map