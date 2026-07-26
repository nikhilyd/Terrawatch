"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAlertStatus = exports.getStats = exports.markRead = exports.getAlertsByZone = exports.getAlerts = void 0;
const Alert_1 = __importDefault(require("../models/Alert"));
const Zone_1 = __importDefault(require("../models/Zone"));
const socket_1 = require("../utils/socket");
// GET /api/alerts
const getAlerts = async (req, res) => {
    try {
        // Only user's own zones ke alerts
        const userZones = await Zone_1.default.find({ createdBy: req.user?.id, isActive: true }).select('_id');
        const zoneIds = userZones.map(z => z._id);
        const alerts = await Alert_1.default.find({ zoneId: { $in: zoneIds } })
            .populate('zoneId', 'name coordinates')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, count: alerts.length, data: alerts });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.getAlerts = getAlerts;
// GET /api/alerts/zone/:id
const getAlertsByZone = async (req, res) => {
    try {
        const alerts = await Alert_1.default.find({ zoneId: req.params.id })
            .sort({ createdAt: -1 });
        res.json({ success: true, count: alerts.length, data: alerts });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.getAlertsByZone = getAlertsByZone;
// PUT /api/alerts/:id/read
const markRead = async (req, res) => {
    try {
        const alert = await Alert_1.default.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
        if (!alert) {
            res.status(404).json({ success: false, message: 'Alert not found' });
            return;
        }
        (0, socket_1.broadcastAlertUpdate)(alert);
        res.json({ success: true, data: alert });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.markRead = markRead;
// GET /api/alerts/stats — Dashboard ke liye
const getStats = async (req, res) => {
    try {
        // User ke zones ke basis pe stats
        const userZones = await Zone_1.default.find({ createdBy: req.user?.id, isActive: true }).select('_id');
        const zoneIds = userZones.map(z => z._id);
        const baseFilter = { zoneId: { $in: zoneIds } };
        const [total, unread, critical, high] = await Promise.all([
            Alert_1.default.countDocuments(baseFilter),
            Alert_1.default.countDocuments({ ...baseFilter, isRead: false }),
            Alert_1.default.countDocuments({ ...baseFilter, severity: 'CRITICAL' }),
            Alert_1.default.countDocuments({ ...baseFilter, severity: 'HIGH' }),
        ]);
        res.json({
            success: true,
            data: { total, unread, critical, high },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.getStats = getStats;
// PUT /api/alerts/:id/status
const updateAlertStatus = async (req, res) => {
    try {
        const { status, resolutionNote } = req.body;
        const validStatuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_ALARM'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ success: false, message: 'Invalid status' });
            return;
        }
        const updateData = {
            status,
            resolutionNote: resolutionNote || '',
        };
        if (status === 'RESOLVED' || status === 'FALSE_ALARM') {
            updateData.resolvedBy = req.user?.id;
            updateData.resolvedAt = new Date();
        }
        else {
            updateData.resolvedBy = null;
            updateData.resolvedAt = null;
        }
        const alert = await Alert_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate('resolvedBy', 'name email');
        if (!alert) {
            res.status(404).json({ success: false, message: 'Alert not found' });
            return;
        }
        (0, socket_1.broadcastAlertUpdate)(alert);
        res.json({ success: true, data: alert });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.updateAlertStatus = updateAlertStatus;
//# sourceMappingURL=alert.controller.js.map