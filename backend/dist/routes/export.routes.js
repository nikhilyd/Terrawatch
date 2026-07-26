"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const export_controller_1 = require("../controllers/export.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
router.get('/zone/:id/csv', export_controller_1.exportZoneScansCSV);
router.get('/zone/:id/stats', export_controller_1.getZoneExportStats);
router.get('/zone/:id/historical/csv', export_controller_1.exportZoneHistoricalCSV);
router.get('/zone/:id/field/csv', export_controller_1.exportZoneFieldReportsCSV);
router.get('/alerts/csv', export_controller_1.exportAlertsCSV);
router.get('/historical/csv', export_controller_1.exportAllHistoricalCSV);
router.get('/field/csv', export_controller_1.exportAllFieldReportsCSV);
exports.default = router;
//# sourceMappingURL=export.routes.js.map