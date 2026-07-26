"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const historical_controller_1 = require("../controllers/historical.controller");
const historicalAnalyze_controller_1 = require("../controllers/historicalAnalyze.controller");
const router = (0, express_1.Router)();
// Public route — historical analysis (called by frontend directly)
router.post('/analyze', historicalAnalyze_controller_1.analyzeHistorical);
// All other routes require auth
router.use(auth_middleware_1.protect);
router.post('/', historical_controller_1.saveAnalysis); // Save new analysis
router.get('/', historical_controller_1.getAnalyses); // List all for user
router.get('/zone/:zoneId', historical_controller_1.getAnalysesByZone); // By zone
router.get('/:id', historical_controller_1.getAnalysis); // Full detail
router.delete('/:id', historical_controller_1.deleteAnalysis); // Delete
exports.default = router;
//# sourceMappingURL=historical.routes.js.map