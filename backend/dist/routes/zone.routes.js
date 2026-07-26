"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zone_controller_1 = require("../controllers/zone.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
router.get('/', zone_controller_1.getZones); // viewer+
router.get('/:id', zone_controller_1.getZone); // viewer+
router.post('/', (0, auth_middleware_1.requireRole)('admin', 'analyst'), zone_controller_1.createZone); // admin, analyst only
router.put('/:id', (0, auth_middleware_1.requireRole)('admin', 'analyst'), zone_controller_1.updateZone); // admin, analyst only
router.delete('/:id', (0, auth_middleware_1.requireRole)('admin'), zone_controller_1.deleteZone); // admin only
exports.default = router;
//# sourceMappingURL=zone.routes.js.map