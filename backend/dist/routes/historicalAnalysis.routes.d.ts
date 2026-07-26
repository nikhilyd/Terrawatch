/**
 * Historical Analysis Routes (replaces ML service historical endpoints)
 * -----------------------------------------------------------------------
 * POST /api/historical/analyze → Multi-date historical analysis
 *   - Fetches Sentinel-2 images for 2-10 dates
 *   - Runs NDVI + GPT-4o on each
 *   - Generates timeline + AI verdict
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=historicalAnalysis.routes.d.ts.map