"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const public_controller_1 = require("../controllers/public.controller");
const router = (0, express_1.Router)();
// NO auth — public access!
router.get('/stats', public_controller_1.getPublicStats); // Global deforestation dashboard
router.get('/zones', public_controller_1.getPublicZones); // Zone list (no sensitive data)
router.get('/alerts', public_controller_1.getPublicAlerts); // Recent HIGH/CRITICAL alerts feed
exports.default = router;
//# sourceMappingURL=public.routes.js.map