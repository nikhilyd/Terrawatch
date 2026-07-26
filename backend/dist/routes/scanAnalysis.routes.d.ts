/**
 * Scan Analysis Routes (replaces ML service HTTP endpoints)
 * -----------------------------------------------------------
 * POST /api/scan/analyze    → Manual zone analysis (Sentinel Hub + NDVI + GPT-4o)
 * POST /api/scan/compare    → Deep dual-image comparison via GPT-4o
 * GET  /api/scan/health     → Service health (Sentinel Hub + OpenAI status)
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=scanAnalysis.routes.d.ts.map