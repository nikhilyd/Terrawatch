/**
 * Export Controller
 * -----------------
 * GET /api/export/zone/:id/csv              → Scan history CSV
 * GET /api/export/alerts/csv               → All alerts CSV
 * GET /api/export/zone/:id/stats           → Zone record counts
 * GET /api/export/zone/:id/historical/csv  → Historical NDVI timeline CSV
 * GET /api/export/zone/:id/field/csv       → Field reports CSV
 * GET /api/export/historical/csv           → All zones historical CSV
 * GET /api/export/field/csv               → All zones field reports CSV
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const exportZoneScansCSV: (req: AuthRequest, res: Response) => Promise<void>;
export declare const exportAlertsCSV: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getZoneExportStats: (req: AuthRequest, res: Response) => Promise<void>;
export declare const exportZoneHistoricalCSV: (req: AuthRequest, res: Response) => Promise<void>;
export declare const exportZoneFieldReportsCSV: (req: AuthRequest, res: Response) => Promise<void>;
export declare const exportAllHistoricalCSV: (req: AuthRequest, res: Response) => Promise<void>;
export declare const exportAllFieldReportsCSV: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=export.controller.d.ts.map