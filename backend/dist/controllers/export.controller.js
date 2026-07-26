"use strict";
/**
 * Export Controller
 * -----------------
 * GET /api/export/zone/:id/csv              → Scan history CSV
 * GET /api/export/alerts/csv               → All alerts CSV
 * GET /api/export/zone/:id/stats           → Zone record counts
 * GET /api/export/zone/:id/historical/csv  → Historical NDVI timeline CSV
 * GET /api/export/zone/:id/field/csv       → Field reports CSV
 * GET /api/export/historical/csv           → All zones historical CSV
 * GET /api/export/field/csv               → All zones field reports CSV
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAllFieldReportsCSV = exports.exportAllHistoricalCSV = exports.exportZoneFieldReportsCSV = exports.exportZoneHistoricalCSV = exports.getZoneExportStats = exports.exportAlertsCSV = exports.exportZoneScansCSV = void 0;
const Zone_1 = __importDefault(require("../models/Zone"));
const Scan_1 = __importDefault(require("../models/Scan"));
const Alert_1 = __importDefault(require("../models/Alert"));
const HistoricalAnalysis_1 = __importDefault(require("../models/HistoricalAnalysis"));
const FieldReport_1 = __importDefault(require("../models/FieldReport"));
// Helper to escape CSV strings
const escapeCSV = (field) => {
    if (field === null || field === undefined)
        return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};
// ── GET /api/export/zone/:id/csv ─────────────────────────────────────────────
const exportZoneScansCSV = async (req, res) => {
    try {
        const zone = await Zone_1.default.findById(req.params.id);
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        const scans = await Scan_1.default.find({ zoneId: req.params.id, status: 'completed' })
            .sort({ createdAt: -1 });
        const headers = [
            'Job ID',
            'Scan Date',
            'Forest %',
            'Vegetation %',
            'Bare Soil %',
            'Water %',
            'NDVI Mean',
            'AI Threats',
            'AI Severity',
            'AI Description'
        ];
        const rows = scans.map(s => {
            const r = s.results;
            return [
                s.jobId,
                s.scanDate?.toISOString() || s.createdAt.toISOString(),
                r?.forestPercentage?.toFixed(2) || '0',
                r?.vegetationPercentage?.toFixed(2) || '0',
                r?.bareSoilPercentage?.toFixed(2) || '0',
                r?.waterPercentage?.toFixed(2) || '0',
                r?.ndviMean?.toFixed(4) || '0',
                escapeCSV((r?.threats || []).join(', ')),
                r?.severity || 'none',
                escapeCSV(r?.description || '')
            ].join(',');
        });
        const csvContent = [headers.join(','), ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="EcoWatch_${zone.name.replace(/\s+/g, '_')}_Scans.csv"`);
        res.send(csvContent);
    }
    catch (err) {
        if (!res.headersSent)
            res.status(500).json({ success: false, error: String(err) });
    }
};
exports.exportZoneScansCSV = exportZoneScansCSV;
// ── GET /api/export/alerts/csv ──────────────────────────────────────────────
const exportAlertsCSV = async (req, res) => {
    try {
        const userZones = await Zone_1.default.find({ createdBy: req.user?.id, isActive: true }).select('_id name');
        const zoneIds = userZones.map(z => z._id);
        const zoneMap = Object.fromEntries(userZones.map(z => [z._id.toString(), z.name]));
        // ── Formal Alerts ─────────────────────────────────────────────────────────
        const alerts = await Alert_1.default.find({ zoneId: { $in: zoneIds } }).sort({ createdAt: -1 });
        // ── Scans with threats ────────────────────────────────────────────────────
        const scans = await Scan_1.default.find({
            zoneId: { $in: zoneIds },
            status: 'completed',
            'results.threats': { $exists: true, $not: { $size: 0 } },
        }).sort({ createdAt: -1 });
        // ── Historical scans with threats ─────────────────────────────────────────
        const analyses = await HistoricalAnalysis_1.default.find({ zoneId: { $in: zoneIds } }).sort({ createdAt: -1 });
        const headers = [
            'Source', 'Date', 'Zone Name', 'Severity',
            'Forest Loss %', 'Threats Detected', 'Description / Message'
        ];
        const rows = [];
        // Add formal alerts
        for (const a of alerts) {
            rows.push([
                'Alert',
                a.createdAt.toISOString().split('T')[0],
                escapeCSV(zoneMap[a.zoneId.toString()] || 'Unknown'),
                a.severity,
                a.forestLoss || '0',
                '',
                escapeCSV(a.message || ''),
            ].join(','));
        }
        // Add regular scans with threats
        for (const s of scans) {
            const threats = (s.results?.threats || []).filter(t => t && t !== 'none');
            if (threats.length === 0)
                continue;
            rows.push([
                'Scan',
                (s.scanDate || s.createdAt).toISOString().split('T')[0],
                escapeCSV(zoneMap[s.zoneId.toString()] || 'Unknown'),
                s.results?.severity || 'none',
                '0',
                escapeCSV(threats.join(', ')),
                escapeCSV(s.results?.description || ''),
            ].join(','));
        }
        // Add historical scan entries with threats
        for (const a of analyses) {
            for (const scan of (a.scans || [])) {
                if (scan.status !== 'done')
                    continue;
                const threats = (scan.threats || []).filter((t) => t && t !== 'none');
                if (threats.length === 0)
                    continue;
                rows.push([
                    'Historical',
                    scan.date || '',
                    escapeCSV(a.zoneName || 'Unknown'),
                    scan.severity || 'none',
                    (scan.delta_from_first ?? 0).toFixed(2),
                    escapeCSV(threats.join(', ')),
                    escapeCSV(scan.description || ''),
                ].join(','));
            }
        }
        if (rows.length === 0) {
            // No threats at all — return informational CSV
            rows.push(['No threats detected yet across any zones', '', '', '', '', '', ''].join(','));
        }
        const csvContent = [headers.join(','), ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="EcoWatch_Global_Threat_Log.csv"');
        res.send(csvContent);
    }
    catch (err) {
        if (!res.headersSent)
            res.status(500).json({ success: false, error: String(err) });
    }
};
exports.exportAlertsCSV = exportAlertsCSV;
// ── GET /api/export/zone/:id/stats ───────────────────────────────────────────
const getZoneExportStats = async (req, res) => {
    try {
        const zoneId = req.params.id;
        const [scanCount, alertCount, fieldCount, histCount] = await Promise.all([
            Scan_1.default.countDocuments({ zoneId, status: 'completed' }),
            Alert_1.default.countDocuments({ zoneId }),
            FieldReport_1.default.countDocuments({ zoneId }),
            HistoricalAnalysis_1.default.countDocuments({ zoneId }),
        ]);
        res.json({ success: true, data: { scanCount, alertCount, fieldCount, histCount } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getZoneExportStats = getZoneExportStats;
// ── GET /api/export/zone/:id/historical/csv ──────────────────────────────────
const exportZoneHistoricalCSV = async (req, res) => {
    try {
        const zone = await Zone_1.default.findById(req.params.id);
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        const analyses = await HistoricalAnalysis_1.default.find({ zoneId: req.params.id }).sort({ createdAt: -1 });
        const headers = [
            'Analysis Date', 'Scan Date', 'Status', 'Forest %', 'Vegetation %',
            'Bare Soil %', 'Water %', 'NDVI Mean', 'Cloud Masked %',
            'Threats', 'Severity', 'Delta from Baseline %', 'Description'
        ];
        const rows = [];
        analyses.forEach((a) => {
            (a.scans || []).forEach((s) => {
                rows.push([
                    new Date(a.createdAt).toISOString().split('T')[0],
                    s.date || '',
                    s.status || '',
                    (s.forest_pct ?? 0).toFixed(2),
                    (s.vegetation_pct ?? 0).toFixed(2),
                    (s.bare_soil_pct ?? 0).toFixed(2),
                    (s.water_pct ?? 0).toFixed(2),
                    (s.ndvi_mean ?? 0).toFixed(4),
                    (s.cloud_pct ?? 0).toFixed(1),
                    escapeCSV((s.threats || []).filter((t) => t !== 'none').join(', ')),
                    s.severity || 'none',
                    (s.delta_from_first ?? 0).toFixed(2),
                    escapeCSV(s.description || ''),
                ].join(','));
            });
        });
        const csv = [headers.join(','), ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="EcoWatch_${zone.name.replace(/\s+/g, '_')}_Historical.csv"`);
        res.send(csv);
    }
    catch (err) {
        if (!res.headersSent)
            res.status(500).json({ success: false, error: String(err) });
    }
};
exports.exportZoneHistoricalCSV = exportZoneHistoricalCSV;
// ── GET /api/export/zone/:id/field/csv ──────────────────────────────────────
const exportZoneFieldReportsCSV = async (req, res) => {
    try {
        const zone = await Zone_1.default.findById(req.params.id);
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        const reports = await FieldReport_1.default.find({ zoneId: req.params.id }).sort({ createdAt: -1 });
        const headers = [
            'Report Date', 'Reporter', 'GPS Lat', 'GPS Lng',
            'Status', 'AI Severity', 'AI Threats', 'AI Confidence', 'Field Notes', 'AI Description'
        ];
        const rows = reports.map((r) => [
            new Date(r.createdAt).toISOString().split('T')[0],
            escapeCSV(r.reporterName || ''),
            r.gps?.lat?.toFixed(6) || '0',
            r.gps?.lng?.toFixed(6) || '0',
            r.status || 'pending',
            r.aiAnalysis?.severity || 'pending',
            escapeCSV((r.aiAnalysis?.threats || []).filter((t) => t !== 'none').join(', ')),
            r.aiAnalysis?.confidence || 'N/A',
            escapeCSV(r.notes || ''),
            escapeCSV(r.aiAnalysis?.description || ''),
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="EcoWatch_${zone.name.replace(/\s+/g, '_')}_FieldReports.csv"`);
        res.send(csv);
    }
    catch (err) {
        if (!res.headersSent)
            res.status(500).json({ success: false, error: String(err) });
    }
};
exports.exportZoneFieldReportsCSV = exportZoneFieldReportsCSV;
// ── GET /api/export/historical/csv  (ALL zones) ──────────────────────────────
const exportAllHistoricalCSV = async (req, res) => {
    try {
        const analyses = await HistoricalAnalysis_1.default.find().populate('zoneId', 'name').sort({ createdAt: -1 });
        const headers = [
            'Zone Name', 'Analysis Date', 'Scan Date', 'Status', 'Forest %',
            'Vegetation %', 'Bare Soil %', 'Water %', 'NDVI Mean', 'Cloud %',
            'Threats', 'Severity', 'Delta %'
        ];
        const rows = [];
        analyses.forEach((a) => {
            const zoneName = a.zoneId?.name || 'Unknown';
            (a.scans || []).forEach((s) => {
                rows.push([
                    escapeCSV(zoneName),
                    new Date(a.createdAt).toISOString().split('T')[0],
                    s.date || '',
                    s.status || '',
                    (s.forest_pct ?? 0).toFixed(2),
                    (s.vegetation_pct ?? 0).toFixed(2),
                    (s.bare_soil_pct ?? 0).toFixed(2),
                    (s.water_pct ?? 0).toFixed(2),
                    (s.ndvi_mean ?? 0).toFixed(4),
                    (s.cloud_pct ?? 0).toFixed(1),
                    escapeCSV((s.threats || []).filter((t) => t !== 'none').join(', ')),
                    s.severity || 'none',
                    (s.delta_from_first ?? 0).toFixed(2),
                ].join(','));
            });
        });
        const csv = [headers.join(','), ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="EcoWatch_All_Historical.csv"');
        res.send(csv);
    }
    catch (err) {
        if (!res.headersSent)
            res.status(500).json({ success: false, error: String(err) });
    }
};
exports.exportAllHistoricalCSV = exportAllHistoricalCSV;
// ── GET /api/export/field/csv  (ALL zones) ───────────────────────────────────
const exportAllFieldReportsCSV = async (req, res) => {
    try {
        const reports = await FieldReport_1.default.find().populate('zoneId', 'name').sort({ createdAt: -1 });
        const headers = [
            'Zone Name', 'Report Date', 'Reporter', 'GPS Lat', 'GPS Lng',
            'Status', 'AI Severity', 'AI Threats', 'AI Confidence', 'Field Notes', 'AI Description'
        ];
        const rows = reports.map((r) => [
            escapeCSV(r.zoneId?.name || 'Unknown'),
            new Date(r.createdAt).toISOString().split('T')[0],
            escapeCSV(r.reporterName || ''),
            r.gps?.lat?.toFixed(6) || '0',
            r.gps?.lng?.toFixed(6) || '0',
            r.status || 'pending',
            r.aiAnalysis?.severity || 'pending',
            escapeCSV((r.aiAnalysis?.threats || []).filter((t) => t !== 'none').join(', ')),
            r.aiAnalysis?.confidence || 'N/A',
            escapeCSV(r.notes || ''),
            escapeCSV(r.aiAnalysis?.description || ''),
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="EcoWatch_All_FieldReports.csv"');
        res.send(csv);
    }
    catch (err) {
        if (!res.headersSent)
            res.status(500).json({ success: false, error: String(err) });
    }
};
exports.exportAllFieldReportsCSV = exportAllFieldReportsCSV;
//# sourceMappingURL=export.controller.js.map