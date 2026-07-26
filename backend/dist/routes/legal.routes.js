"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const legal_controller_1 = require("../controllers/legal.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
// Feature 1: Carbon Loss Calculator
router.get('/zone/:id/carbon', legal_controller_1.getCarbonLoss); // GET → CO₂ + economic damage
// Feature 2: FIR Legal Evidence Report
router.get('/zone/:id/fir', legal_controller_1.downloadFIRReport); // GET → PDF download
// Feature 3: Zone Risk Score
router.get('/zone/:id/risk', legal_controller_1.getZoneRiskScore); // GET → Single zone risk
router.get('/risk-scores', legal_controller_1.getAllRiskScores); // GET → All zones ranked
exports.default = router;
//# sourceMappingURL=legal.routes.js.map