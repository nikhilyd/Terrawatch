"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerAllScans = exports.retryScan = exports.compareScans = exports.getScan = exports.getScansByZone = exports.getAllScans = exports.triggerScan = void 0;
const uuid_1 = require("uuid");
const Scan_1 = __importDefault(require("../models/Scan"));
const Zone_1 = __importDefault(require("../models/Zone"));
const scanProcessor_1 = require("../scheduler/scanProcessor");
const autoScan_scheduler_1 = require("../scheduler/autoScan.scheduler");
const socket_1 = require("../utils/socket");
// ── Date helpers ─────────────────────────────────────────────
const formatDate = (d) => d.toISOString().split('T')[0];
const getDefaultDateFrom = () => {
    const d = new Date();
    // 45 din ka window — monsoon/cloud cover handle karne ke liye
    // Sentinel-2 leastCC mosaicking best clear image choose karega
    d.setDate(d.getDate() - 45);
    return formatDate(d);
};
// ── POST /api/scans/trigger — Manual scan start ──────────────
const triggerScan = async (req, res) => {
    try {
        const { zoneId, dateFrom, dateTo } = req.body;
        if (!zoneId) {
            res.status(400).json({ success: false, message: 'zoneId required' });
            return;
        }
        const zone = await Zone_1.default.findById(zoneId);
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        if (!zone.bbox) {
            res.status(400).json({ success: false, message: 'Zone bbox not configured' });
            return;
        }
        const jobId = (0, uuid_1.v4)();
        const from = dateFrom || getDefaultDateFrom();
        const to = dateTo || formatDate(new Date());
        // Kafka job
        const job = {
            job_id: jobId,
            zone_id: zone._id.toString(),
            zone_name: zone.name,
            bbox: [zone.bbox.lng_min, zone.bbox.lat_min,
                zone.bbox.lng_max, zone.bbox.lat_max],
            date_from: from,
            date_to: to,
            resolution: zone.sentinelConfig?.resolution ?? 20, // 20m = faster!
        };
        // Pending scan record banao
        const scan = await Scan_1.default.create({
            zoneId,
            jobId,
            imagePath: `sentinel://${zone.name}/${from}->${to}`,
            status: 'pending',
        });
        // Kafka pe publish karo
        // Background scan trigger
        (0, scanProcessor_1.processScanJob)(job).catch(err => console.error(`[${jobId}] Background scan failed:`, err));
        console.log(`[${jobId}] Scan triggered | zone=${zone.name} | ${from} -> ${to}`);
        const populatedScan = await Scan_1.default.findById(scan._id).populate('zoneId', 'name bbox');
        if (populatedScan) {
            (0, socket_1.broadcastScanUpdate)(populatedScan);
        }
        res.status(202).json({
            success: true,
            message: 'Scan job queued',
            data: { scanId: scan._id, jobId, dateFrom: from, dateTo: to },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.triggerScan = triggerScan;
// ── GET /api/scans — All scans (optional zoneId filter) ────────
// URL: /api/scans?zone=<zoneId>&status=completed&limit=20
const getAllScans = async (req, res) => {
    try {
        const filter = {};
        if (req.query.zone)
            filter.zoneId = req.query.zone;
        if (req.query.status)
            filter.status = req.query.status;
        const limit = parseInt(req.query.limit) || 50;
        const scans = await Scan_1.default.find(filter)
            .populate('zoneId', 'name bbox')
            .sort({ createdAt: -1 })
            .limit(limit);
        res.json({ success: true, count: scans.length, data: scans });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.getAllScans = getAllScans;
// ── GET /api/scans/zone/:id ─────────────────────────────────────────
const getScansByZone = async (req, res) => {
    try {
        const scans = await Scan_1.default.find({ zoneId: req.params.id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({ success: true, count: scans.length, data: scans });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.getScansByZone = getScansByZone;
// ── GET /api/scans/:id ───────────────────────────────────────
const getScan = async (req, res) => {
    try {
        const scan = await Scan_1.default.findById(req.params.id).populate('zoneId');
        if (!scan) {
            res.status(404).json({ success: false, message: 'Scan not found' });
            return;
        }
        res.json({ success: true, data: scan });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.getScan = getScan;
// ── GET /api/scans/compare/:id1/:id2 ────────────────────────
const compareScans = async (req, res) => {
    try {
        const [scan1, scan2] = await Promise.all([
            Scan_1.default.findById(req.params.id1),
            Scan_1.default.findById(req.params.id2),
        ]);
        if (!scan1 || !scan2) {
            res.status(404).json({ success: false, message: 'One or both scans not found' });
            return;
        }
        const forestLoss = scan1.results.forestPercentage - scan2.results.forestPercentage;
        res.json({
            success: true,
            data: {
                before: { scanId: scan1._id, date: scan1.scanDate, forestPct: scan1.results.forestPercentage },
                after: { scanId: scan2._id, date: scan2.scanDate, forestPct: scan2.results.forestPercentage },
                forestLoss: parseFloat(forestLoss.toFixed(2)),
                deforestationDetected: forestLoss > 0,
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.compareScans = compareScans;
// ── POST /api/scans/:id/retry ─────────────────────────────────────────
// Failed scan ko dobara queue karo
const retryScan = async (req, res) => {
    try {
        const scan = await Scan_1.default.findById(req.params.id);
        if (!scan) {
            res.status(404).json({ success: false, message: 'Scan not found' });
            return;
        }
        if (scan.status === 'completed') {
            res.status(400).json({ success: false, message: 'Scan already completed — no retry needed' });
            return;
        }
        if (scan.status === 'processing') {
            res.status(400).json({ success: false, message: 'Scan is currently processing — wait for it to complete' });
            return;
        }
        // Reset scan status
        await Scan_1.default.findByIdAndUpdate(scan._id, {
            status: 'pending',
            failedAt: null,
            failReason: '',
        });
        // Re-publish to Kafka
        const newJobId = await (0, autoScan_scheduler_1.publishScanJob)(scan.zoneId.toString());
        console.log(`[${scan.jobId}] Retry requested -> new job: ${newJobId}`);
        const updatedScan = await Scan_1.default.findById(scan._id).populate('zoneId', 'name bbox');
        if (updatedScan) {
            (0, socket_1.broadcastScanUpdate)(updatedScan);
        }
        res.json({
            success: true,
            message: 'Scan re-queued successfully',
            data: { originalJobId: scan.jobId, newJobId },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.retryScan = retryScan;
// ── POST /api/scans/trigger-all ───────────────────────────────────────────
// Manually trigger scans for ALL active zones (Batch Operation)
const triggerAllScans = async (_req, res) => {
    try {
        const zones = await Zone_1.default.find({ isActive: true });
        if (zones.length === 0) {
            res.status(400).json({ success: false, message: 'No active zones found to scan' });
            return;
        }
        const jobIds = await Promise.all(zones.map(zone => (0, autoScan_scheduler_1.publishScanJob)(zone._id.toString())));
        const successfulJobs = jobIds.filter(id => id !== null);
        res.json({
            success: true,
            message: `Triggered scans for ${successfulJobs.length} out of ${zones.length} active zones.`,
            data: {
                totalZones: zones.length,
                queuedJobs: successfulJobs.length
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.triggerAllScans = triggerAllScans;
//# sourceMappingURL=scan.controller.js.map