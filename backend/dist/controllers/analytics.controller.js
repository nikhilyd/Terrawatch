"use strict";
/**
 * Analytics Controller
 * --------------------
 * GET /api/analytics/threat-distribution   → Pie chart data (logging vs mining vs fire etc)
 * GET /api/analytics/alerts-over-time      → Bar chart data (alerts per month/week)
 * GET /api/analytics/zone-comparisons      → Radar/Bar chart (comparing top zones by loss)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThreatTypeBreakdown = exports.getAlertsOverTime = exports.getThreatDistribution = void 0;
const Alert_1 = __importDefault(require("../models/Alert"));
const Zone_1 = __importDefault(require("../models/Zone"));
const Scan_1 = __importDefault(require("../models/Scan"));
const HistoricalAnalysis_1 = __importDefault(require("../models/HistoricalAnalysis"));
// ── GET /api/analytics/threat-distribution ──────────────────────────────────
const getThreatDistribution = async (req, res) => {
    try {
        const userZones = await Zone_1.default.find({ createdBy: req.user?.id, isActive: true }).select('_id');
        const zoneIds = userZones.map(z => z._id);
        const pipeline = [
            { $match: { status: 'completed', zoneId: { $in: zoneIds } } },
            { $unwind: '$results.threats' },
            { $match: { 'results.threats': { $ne: 'none' } } },
            { $group: { _id: '$results.threats', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ];
        const stats = await Scan_1.default.aggregate(pipeline);
        // Format for Chart.js / Recharts
        const labels = stats.map(s => s._id.toUpperCase());
        const data = stats.map(s => s.count);
        res.json({
            success: true,
            data: {
                labels,
                datasets: [{
                        data,
                        backgroundColor: ['#c62828', '#e65100', '#f9a825', '#1565c0', '#4a148c', '#00695c']
                    }]
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getThreatDistribution = getThreatDistribution;
// ── GET /api/analytics/alerts-over-time ──────────────────────────────────────
const getAlertsOverTime = async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 6;
        const since = new Date();
        since.setMonth(since.getMonth() - months);
        since.setDate(1); // Start of month
        // User ke zones filter
        const userZones = await Zone_1.default.find({ createdBy: req.user?.id, isActive: true }).select('_id');
        const zoneIds = userZones.map(z => z._id);
        const pipeline = [
            { $match: { createdAt: { $gte: since }, zoneId: { $in: zoneIds } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        severity: '$severity'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ];
        const rawData = await Alert_1.default.aggregate(pipeline);
        // Format for grouped bar chart
        const labelsMap = new Map(); // "YYYY-MM" -> { critical: 0, high: 0, medium: 0 }
        // Initialize last N months
        for (let i = 0; i < months; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            labelsMap.set(label, { critical: 0, high: 0, medium: 0 });
        }
        // Populate data
        rawData.forEach(item => {
            const label = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
            if (labelsMap.has(label)) {
                const severity = item._id.severity.toLowerCase();
                if (['critical', 'high', 'medium'].includes(severity)) {
                    labelsMap.get(label)[severity] = item.count;
                }
            }
        });
        // Sort chronologically
        const sortedLabels = Array.from(labelsMap.keys()).sort();
        const datasets = [
            {
                label: 'Critical',
                data: sortedLabels.map(l => labelsMap.get(l).critical),
                backgroundColor: '#c62828'
            },
            {
                label: 'High',
                data: sortedLabels.map(l => labelsMap.get(l).high),
                backgroundColor: '#e65100'
            },
            {
                label: 'Medium',
                data: sortedLabels.map(l => labelsMap.get(l).medium),
                backgroundColor: '#f9a825'
            }
        ];
        res.json({
            success: true,
            data: {
                labels: sortedLabels,
                datasets
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getAlertsOverTime = getAlertsOverTime;
// ── GET /api/analytics/threat-types ────────────────────────────────────────────
const getThreatTypeBreakdown = async (_req, res) => {
    try {
        const scanPipeline = [
            { $match: { status: 'completed' } },
            { $unwind: '$results.threats' },
            { $match: { 'results.threats': { $ne: 'none' } } },
            { $group: { _id: '$results.threats', count: { $sum: 1 } } },
        ];
        const histPipeline = [
            { $unwind: '$scans' },
            { $unwind: '$scans.threats' },
            { $match: { 'scans.threats': { $ne: 'none' }, 'scans.status': 'done' } },
            { $group: { _id: '$scans.threats', count: { $sum: 1 } } },
        ];
        const [scanStats, histStats] = await Promise.all([
            Scan_1.default.aggregate(scanPipeline),
            HistoricalAnalysis_1.default.aggregate(histPipeline),
        ]);
        const merged = {};
        [...scanStats, ...histStats].forEach((s) => {
            const key = s._id.toLowerCase().replace(/\s+/g, '_');
            merged[key] = (merged[key] ?? 0) + s.count;
        });
        const sorted = Object.entries(merged)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8);
        const THREAT_COLORS = {
            illegal_logging: '#ef4444',
            encroachment: '#f97316',
            deforestation: '#dc2626',
            mining: '#a16207',
            fire: '#f59e0b',
            water_pollution: '#3b82f6',
            industrialization: '#8b5cf6',
            agriculture: '#22c55e',
        };
        res.json({
            success: true,
            data: sorted.map(([threat, count]) => ({
                threat,
                count,
                color: THREAT_COLORS[threat] ?? '#6b7280',
            })),
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getThreatTypeBreakdown = getThreatTypeBreakdown;
//# sourceMappingURL=analytics.controller.js.map