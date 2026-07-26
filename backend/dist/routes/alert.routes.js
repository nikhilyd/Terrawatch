"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alert_controller_1 = require("../controllers/alert.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
router.get('/', alert_controller_1.getAlerts);
router.get('/stats', alert_controller_1.getStats);
router.get('/zone/:id', alert_controller_1.getAlertsByZone);
router.put('/:id/read', alert_controller_1.markRead);
router.put('/:id/status', alert_controller_1.updateAlertStatus);
exports.default = router;
//# sourceMappingURL=alert.routes.js.map