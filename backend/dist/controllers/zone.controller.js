"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteZone = exports.updateZone = exports.getZone = exports.getZones = exports.createZone = void 0;
const Zone_1 = __importDefault(require("../models/Zone"));
const socket_1 = require("../utils/socket");
// POST /api/zones
const createZone = async (req, res) => {
    try {
        const zone = await Zone_1.default.create({ ...req.body, createdBy: req.user?.id });
        (0, socket_1.broadcastZoneUpdate)(zone, 'created');
        res.status(201).json({ success: true, data: zone });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.createZone = createZone;
// GET /api/zones
const getZones = async (req, res) => {
    try {
        const zones = await Zone_1.default.find({ isActive: true, createdBy: req.user?.id }).populate('createdBy', 'name email');
        res.json({ success: true, count: zones.length, data: zones });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.getZones = getZones;
// GET /api/zones/:id
const getZone = async (req, res) => {
    try {
        const zone = await Zone_1.default.findById(req.params.id);
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        res.json({ success: true, data: zone });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.getZone = getZone;
// PUT /api/zones/:id
const updateZone = async (req, res) => {
    try {
        const zone = await Zone_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        (0, socket_1.broadcastZoneUpdate)(zone, 'updated');
        res.json({ success: true, data: zone });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.updateZone = updateZone;
// DELETE /api/zones/:id
const deleteZone = async (req, res) => {
    try {
        const zone = await Zone_1.default.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        (0, socket_1.broadcastZoneUpdate)(zone, 'deleted');
        res.json({ success: true, message: 'Zone deactivated' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.deleteZone = deleteZone;
//# sourceMappingURL=zone.controller.js.map