"use strict";
/**
 * Public Stats Controller  — NO AUTH REQUIRED!
 * ----------------------------------------------
 * GET /api/public/stats     → Global deforestation dashboard stats
 * GET /api/public/zones     → Read-only zone list (no sensitive data)
 * GET /api/public/alerts    → Recent public alerts feed
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicAlerts = exports.getPublicZones = exports.getPublicStats = void 0;
const Zone_1 = __importDefault(require("../models/Zone"));
const Scan_1 = __importDefault(require("../models/Scan"));
const Alert_1 = __importDefault(require("../models/Alert"));
const Campaign_1 = __importDefault(require("../models/Campaign"));
// ── GET /api/public/stats ────────────────────────────────────────────────────
const getPublicStats = async (_req, res) => {
    try {
        const [totalZones, totalScans, totalAlerts, criticalAlerts, highAlerts, recentScans, activeCampaigns, totalCampaigns,] = await Promise.all([
            Zone_1.default.countDocuments({ isActive: true }),
            Scan_1.default.countDocuments({ status: 'completed' }),
            Alert_1.default.countDocuments(),
            Alert_1.default.countDocuments({ severity: 'CRITICAL' }),
            Alert_1.default.countDocuments({ severity: 'HIGH' }),
            Scan_1.default.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(50),
            Campaign_1.default.countDocuments({ status: 'active' }),
            Campaign_1.default.countDocuments(),
        ]);
        // Calculate aggregate forest stats
        const forestValues = recentScans.map(s => s.results?.forestPercentage).filter(v => v != null);
        const avgForestPct = forestValues.length > 0
            ? parseFloat((forestValues.reduce((a, b) => a + b, 0) / forestValues.length).toFixed(2))
            : null;
        // Total carbon estimate
        const totalAlertsList = await Alert_1.default.find({ forestLoss: { $gt: 0 } });
        const totalLossPct = totalAlertsList.reduce((sum, a) => sum + (a.forestLoss || 0), 0);
        const CO2_PER_LOSS_PCT = 400; // rough estimate tonnes per % per zone
        const co2EstimateTonnes = Math.round(totalLossPct * CO2_PER_LOSS_PCT);
        // Most recent scan
        const latestScan = recentScans[0];
        // Most dangerous zone (most alerts)
        const alertAgg = await Alert_1.default.aggregate([
            { $group: { _id: '$zoneId', count: { $sum: 1 }, maxLoss: { $max: '$forestLoss' } } },
            { $sort: { count: -1 } },
            { $limit: 1 },
        ]);
        let mostDangerousZone = null;
        if (alertAgg.length > 0) {
            const zdoc = await Zone_1.default.findById(alertAgg[0]._id);
            if (zdoc)
                mostDangerousZone = { name: zdoc.name, alerts: alertAgg[0].count, maxLoss: alertAgg[0].maxLoss };
        }
        res.json({
            success: true,
            lastUpdated: new Date().toISOString(),
            // Top-level fields (home page stat cards)
            data: {
                totalZones,
                totalScans,
                totalAlerts,
                activeThreats: criticalAlerts + highAlerts,
                activeCampaigns,
                totalCampaigns,
                monitoring: {
                    totalZonesMonitored: totalZones,
                    totalSatelliteScans: totalScans,
                    latestScanDate: latestScan?.scanDate ?? null,
                    averageForestCoverage: avgForestPct ? `${avgForestPct}%` : 'N/A',
                },
                alerts: {
                    totalAlertsRaised: totalAlerts,
                    criticalAlerts,
                    highAlerts,
                    activeThreats: criticalAlerts + highAlerts,
                },
                campaigns: {
                    active: activeCampaigns,
                    total: totalCampaigns,
                },
                environment: {
                    co2EstimateTonnes,
                    co2EstimateLakhsINR: parseFloat((co2EstimateTonnes * 1000 / 100000).toFixed(2)),
                    note: 'Estimates based on CAMPA ₹1000/tonne CO₂ rate',
                },
                spotlight: {
                    mostDangerousZone,
                },
                poweredBy: 'Sentinel-2 (ESA Copernicus) + GPT-4o Vision AI + NDVI Physics Analysis',
                dataPolicy: 'This data is provided for public transparency and environmental awareness.',
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getPublicStats = getPublicStats;
// ── GET /api/public/zones ─────────────────────────────────────────────────────
const getPublicZones = async (_req, res) => {
    try {
        const zones = await Zone_1.default.find({ isActive: true }).select('name description coordinates area_km2 lastScanned');
        const zonesWithStats = await Promise.all(zones.map(async (zone) => {
            const [latestScan, alertCount] = await Promise.all([
                Scan_1.default.findOne({ zoneId: zone._id, status: 'completed' }).sort({ createdAt: -1 })
                    .select('results.forestPercentage results.severity results.threats scanDate'),
                Alert_1.default.countDocuments({ zoneId: zone._id }),
            ]);
            return {
                id: zone._id,
                name: zone.name,
                description: zone.description,
                coordinates: zone.coordinates,
                area_km2: zone.area_km2,
                lastScan: latestScan?.scanDate ?? null,
                forestPct: latestScan?.results?.forestPercentage ?? null,
                severity: latestScan?.results?.severity ?? 'unknown',
                alertCount,
            };
        }));
        res.json({ success: true, count: zonesWithStats.length, data: zonesWithStats });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getPublicZones = getPublicZones;
// ── GET /api/public/alerts ────────────────────────────────────────────────────
const getPublicAlerts = async (_req, res) => {
    try {
        const alerts = await Alert_1.default.find({ severity: { $in: ['HIGH', 'CRITICAL'] } })
            .populate('zoneId', 'name coordinates')
            .sort({ createdAt: -1 })
            .limit(20)
            .select('zoneId severity forestLoss message changeType probableCause changedAreas createdAt');
        const publicAlerts = alerts.map(a => ({
            zone: a.zoneId?.name ?? 'Unknown',
            coordinates: a.zoneId?.coordinates ?? null,
            severity: a.severity,
            forestLoss: `${a.forestLoss}%`,
            message: a.message,
            changeType: a.changeType || null,
            probableCause: a.probableCause || null,
            changedAreas: a.changedAreas || [],
            date: a.createdAt,
        }));
        res.json({ success: true, count: publicAlerts.length, data: publicAlerts });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getPublicAlerts = getPublicAlerts;
//# sourceMappingURL=public.controller.js.map