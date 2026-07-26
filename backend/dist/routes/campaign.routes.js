"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const campaign_controller_1 = require("../controllers/campaign.controller");
const router = (0, express_1.Router)();
// All routes require auth
router.use(auth_middleware_1.protect);
// Preview utility (no DB write)
router.post('/preview-dates', campaign_controller_1.previewDates);
// CRUD
router.post('/', campaign_controller_1.createCampaign);
router.get('/', campaign_controller_1.getCampaigns);
router.get('/:id', campaign_controller_1.getCampaign);
router.patch('/:id/pause', campaign_controller_1.togglePause);
router.delete('/:id', campaign_controller_1.deleteCampaign);
exports.default = router;
//# sourceMappingURL=campaign.routes.js.map