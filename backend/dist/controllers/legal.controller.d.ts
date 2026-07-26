/**
 * Legal & Intelligence Controller
 * --------------------------------
 * Feature 1: Carbon Loss Calculator  — GET /api/legal/zone/:id/carbon
 * Feature 2: FIR-Ready Legal Report  — GET /api/legal/zone/:id/fir
 * Feature 3: Zone Risk Score         — GET /api/legal/zone/:id/risk
 *             All Zones Risk         — GET /api/legal/risk-scores
 *
 * Data Source Priority:
 *   1. HistoricalAnalysis model (primary — rich NDVI + SCL data)
 *   2. Scan model (fallback — campaign monitoring scans)
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getCarbonLoss: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getZoneRiskScore: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllRiskScores: (req: AuthRequest, res: Response) => Promise<void>;
export declare const downloadFIRReport: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=legal.controller.d.ts.map