"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("../controllers/report.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
// Feature 1: PDF Download
router.get('/zone/:id', report_controller_1.downloadZoneReport); // GET → PDF download
// Feature 2: Email Report
router.post('/zone/:id/email', report_controller_1.emailZoneReport); // POST { toEmail } → email bhejo
// Feature 3: Forest Trend Data (for charts)
router.get('/zone/:id/trend', report_controller_1.getForestTrend); // GET → JSON trend data
exports.default = router;
//# sourceMappingURL=report.routes.js.map