/**
 * Analytics Controller
 * --------------------
 * GET /api/analytics/threat-distribution   → Pie chart data (logging vs mining vs fire etc)
 * GET /api/analytics/alerts-over-time      → Bar chart data (alerts per month/week)
 * GET /api/analytics/zone-comparisons      → Radar/Bar chart (comparing top zones by loss)
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getThreatDistribution: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAlertsOverTime: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getThreatTypeBreakdown: (_req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=analytics.controller.d.ts.map