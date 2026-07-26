"use strict";
/**
 * Field Report Controller
 * ------------------------
 * POST /api/field/report  — Field officer photo + GPS upload → GPT-4o analyzes
 * GET  /api/field/reports — All field reports for a zone
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFieldReports = exports.submitFieldReport = void 0;
const fs_1 = __importDefault(require("fs"));
const FieldReport_1 = __importDefault(require("../models/FieldReport"));
const Alert_1 = __importDefault(require("../models/Alert"));
const Zone_1 = __importDefault(require("../models/Zone"));
const socket_1 = require("../utils/socket");
const visionAnalysis_1 = require("../services/visionAnalysis");
// ── POST /api/field/report ────────────────────────────────────────────────────
const submitFieldReport = async (req, res) => {
    try {
        const { zoneId, lat, lng, notes, reporterName } = req.body;
        const file = req.file;
        if (!zoneId || !file) {
            res.status(400).json({ success: false, message: 'zoneId and photo required' });
            return;
        }
        const zone = await Zone_1.default.findById(zoneId);
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        // Save field report to DB first
        const report = await FieldReport_1.default.create({
            zoneId,
            reportedBy: req.user?.id,
            reporterName: reporterName || 'Field Officer',
            imagePath: file.path,
            gps: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
            notes: notes || '',
            status: 'pending',
        });
        // Send image to GPT-4o Vision for analysis
        try {
            const imageBuffer = fs_1.default.readFileSync(file.path);
            const base64Image = imageBuffer.toString('base64');
            const mlRes = await (0, visionAnalysis_1.analyzeFieldPhoto)(base64Image, zone.name, { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 }, notes || '');
            if (mlRes) {
                await FieldReport_1.default.findByIdAndUpdate(report._id, {
                    status: 'analyzed',
                    aiAnalysis: {
                        threats: mlRes.threats ?? [],
                        severity: mlRes.severity ?? 'none',
                        description: mlRes.description ?? '',
                        confidence: mlRes.confidence ?? 'low',
                    },
                });
                // AUTO-ALERT: HIGH ya CRITICAL severity par alert create
                const sev = (mlRes.severity ?? 'none').toLowerCase();
                if (sev === 'high' || sev === 'critical') {
                    try {
                        const alert = await Alert_1.default.create({
                            zoneId: zoneId,
                            source: 'field_report',
                            fieldReportId: report._id,
                            scanId: null,
                            forestLoss: 0,
                            severity: sev.toUpperCase(),
                            message: `Field Officer Alert: ${(mlRes.threats ?? []).filter((t) => t !== 'none').join(', ') || 'Threat detected'} at ${zone.name} (GPS: ${lat}, ${lng})`,
                            changeType: mlRes.threats?.[0] ?? 'field_report',
                            probableCause: mlRes.description ?? '',
                            changeDescription: mlRes.description ?? '',
                            hotspot: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
                        });
                        // Real-time broadcast
                        (0, socket_1.broadcastAlert)({
                            ...alert.toObject(),
                            zoneName: zone.name,
                            source: 'field_report',
                        });
                        console.log(`[Field] AUTO-ALERT created | zone=${zone.name} | severity=${sev.toUpperCase()} | id=${alert._id}`);
                    }
                    catch (alertErr) {
                        console.error('[Field] Auto-alert creation failed:', alertErr);
                    }
                }
            }
        }
        catch (mlErr) {
            console.error('GPT-4o field analysis failed:', mlErr?.message);
            // Report saved, just not analyzed — still useful
        }
        const saved = await FieldReport_1.default.findById(report._id).populate('zoneId', 'name');
        // Broadcast the updated report via Socket.IO
        if (saved) {
            (0, socket_1.broadcastFieldReport)(saved);
        }
        res.status(201).json({ success: true, data: saved });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.submitFieldReport = submitFieldReport;
// ── GET /api/field/reports?zone=:id ──────────────────────────────────────────
const getFieldReports = async (req, res) => {
    try {
        const filter = {};
        if (req.query.zone)
            filter.zoneId = req.query.zone;
        const reports = await FieldReport_1.default.find(filter)
            .populate('zoneId', 'name')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, count: reports.length, data: reports });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getFieldReports = getFieldReports;
//# sourceMappingURL=field.controller.js.map