"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scan_controller_1 = require("../controllers/scan.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
router.get('/', scan_controller_1.getAllScans); // viewer+
router.get('/zone/:id', scan_controller_1.getScansByZone); // viewer+
router.get('/compare/:id1/:id2', scan_controller_1.compareScans); // viewer+
router.get('/:id', scan_controller_1.getScan); // viewer+
router.post('/trigger', (0, auth_middleware_1.requireRole)('admin', 'analyst'), scan_controller_1.triggerScan); // admin, analyst only
router.post('/trigger-all', (0, auth_middleware_1.requireRole)('admin', 'analyst'), scan_controller_1.triggerAllScans); // batch scan
router.post('/:id/retry', (0, auth_middleware_1.requireRole)('admin', 'analyst'), scan_controller_1.retryScan); // retry failed scan
exports.default = router;
//# sourceMappingURL=scan.routes.js.map