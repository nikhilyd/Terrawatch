/**
 * Field Report Controller
 * ------------------------
 * POST /api/field/report  — Field officer photo + GPS upload → GPT-4o analyzes
 * GET  /api/field/reports — All field reports for a zone
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const submitFieldReport: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFieldReports: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=field.controller.d.ts.map