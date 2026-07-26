/**
 * Public Stats Controller  — NO AUTH REQUIRED!
 * ----------------------------------------------
 * GET /api/public/stats     → Global deforestation dashboard stats
 * GET /api/public/zones     → Read-only zone list (no sensitive data)
 * GET /api/public/alerts    → Recent public alerts feed
 */
import { Request, Response } from 'express';
export declare const getPublicStats: (_req: Request, res: Response) => Promise<void>;
export declare const getPublicZones: (_req: Request, res: Response) => Promise<void>;
export declare const getPublicAlerts: (_req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=public.controller.d.ts.map