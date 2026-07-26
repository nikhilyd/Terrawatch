"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
// Admin only — User management
router.get('/', (0, auth_middleware_1.requireRole)('admin'), user_controller_1.getAllUsers);
router.get('/:id', (0, auth_middleware_1.requireRole)('admin'), user_controller_1.getUser);
router.put('/:id/role', (0, auth_middleware_1.requireRole)('admin'), user_controller_1.updateUserRole);
router.delete('/:id', (0, auth_middleware_1.requireRole)('admin'), user_controller_1.deleteUser);
// Any logged-in user — own notification prefs
router.put('/me/notify', user_controller_1.updateNotifyPrefs);
exports.default = router;
//# sourceMappingURL=user.routes.js.map