/**
 * Report Controller
 * -----------------
 * Feature 1: PDF Report Generator
 * Government-ready PDF with forest trends, NDVI stats, AI analysis, alerts history.
 *
 * GET /api/reports/zone/:id          → Download PDF for a zone
 * GET /api/reports/zone/:id/trend    → JSON trend data (for charts)
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getForestTrend: (req: AuthRequest, res: Response) => Promise<void>;
export declare const downloadZoneReport: (req: AuthRequest, res: Response) => Promise<void>;
export declare const emailZoneReport: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=report.controller.d.ts.map