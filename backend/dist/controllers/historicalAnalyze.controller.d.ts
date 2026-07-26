/**
 * Historical Analysis Controller
 * --------------------------------
 * POST /api/historical/analyze — Multi-date historical analysis
 * Fetches Sentinel-2 images for 2-10 dates, runs NDVI + GPT-4o on each,
 * generates timeline + AI verdict.
 */
import { Request, Response } from 'express';
export declare const analyzeHistorical: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=historicalAnalyze.controller.d.ts.map