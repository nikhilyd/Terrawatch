"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
router.get('/threat-distribution', analytics_controller_1.getThreatDistribution);
router.get('/alerts-over-time', analytics_controller_1.getAlertsOverTime);
router.get('/threat-types', analytics_controller_1.getThreatTypeBreakdown);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map