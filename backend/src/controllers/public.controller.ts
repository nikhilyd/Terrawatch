/**
 * Public Stats Controller  — NO AUTH REQUIRED!
 * ----------------------------------------------
 * GET /api/public/stats     → Global deforestation dashboard stats
 * GET /api/public/zones     → Read-only zone list (no sensitive data)
 * GET /api/public/alerts    → Recent public alerts feed
 */

import { Request, Response } from 'express';
import Zone     from '../models/Zone';
import Scan     from '../models/Scan';
import Alert    from '../models/Alert';
import Campaign from '../models/Campaign';

// ── GET /api/public/stats ────────────────────────────────────────────────────
export const getPublicStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalZones,
      totalScans,
      totalAlerts,
      criticalAlerts,
      highAlerts,
      recentScans,
      activeCampaigns,
      totalCampaigns,
    ] = await Promise.all([
      Zone.countDocuments({ isActive: true }),
      Scan.countDocuments({ status: 'completed' }),
      Alert.countDocuments(),
      Alert.countDocuments({ severity: 'CRITICAL' }),
      Alert.countDocuments({ severity: 'HIGH' }),
      Scan.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(50),
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments(),
    ]);

    // Calculate aggregate forest stats
    const forestValues    = recentScans.map(s => s.results?.forestPercentage as number).filter(v => v != null);
    const avgForestPct    = forestValues.length > 0
      ? parseFloat((forestValues.reduce((a, b) => a + b, 0) / forestValues.length).toFixed(2))
      : null;

    // Total carbon estimate
    const totalAlertsList = await Alert.find({ forestLoss: { $gt: 0 } });
    const totalLossPct    = totalAlertsList.reduce((sum, a) => sum + (a.forestLoss || 0), 0);
    const CO2_PER_LOSS_PCT = 400;  // rough estimate tonnes per % per zone
    const co2EstimateTonnes = Math.round(totalLossPct * CO2_PER_LOSS_PCT);

    // Most recent scan
    const latestScan = recentScans[0];

    // Most dangerous zone (most alerts)
    const alertAgg = await Alert.aggregate([
      { $group: { _id: '$zoneId', count: { $sum: 1 }, maxLoss: { $max: '$forestLoss' } } },
      { $sort:  { count: -1 } },
      { $limit: 1 },
    ]);
    let mostDangerousZone = null;
    if (alertAgg.length > 0) {
      const zdoc = await Zone.findById(alertAgg[0]._id);
      if (zdoc) mostDangerousZone = { name: zdoc.name, alerts: alertAgg[0].count, maxLoss: alertAgg[0].maxLoss };
    }

    res.json({
      success:    true,
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
          totalZonesMonitored:   totalZones,
          totalSatelliteScans:   totalScans,
          latestScanDate:        latestScan?.scanDate ?? null,
          averageForestCoverage: avgForestPct ? `${avgForestPct}%` : 'N/A',
        },
        alerts: {
          totalAlertsRaised: totalAlerts,
          criticalAlerts,
          highAlerts,
          activeThreats:     criticalAlerts + highAlerts,
        },
        campaigns: {
          active:  activeCampaigns,
          total:   totalCampaigns,
        },
        environment: {
          co2EstimateTonnes,
          co2EstimateLakhsINR: parseFloat((co2EstimateTonnes * 1000 / 100_000).toFixed(2)),
          note:                'Estimates based on CAMPA ₹1000/tonne CO₂ rate',
        },
        spotlight: {
          mostDangerousZone,
        },
        poweredBy:  'Sentinel-2 (ESA Copernicus) + GPT-4o Vision AI + NDVI Physics Analysis',
        dataPolicy: 'This data is provided for public transparency and environmental awareness.',
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};


// ── GET /api/public/zones ─────────────────────────────────────────────────────
export const getPublicZones = async (_req: Request, res: Response): Promise<void> => {
  try {
    const zones = await Zone.find({ isActive: true }).select('name description coordinates area_km2 lastScanned');

    const zonesWithStats = await Promise.all(zones.map(async (zone) => {
      const [latestScan, alertCount] = await Promise.all([
        Scan.findOne({ zoneId: zone._id, status: 'completed' }).sort({ createdAt: -1 })
            .select('results.forestPercentage results.severity results.threats scanDate'),
        Alert.countDocuments({ zoneId: zone._id }),
      ]);
      return {
        id:          zone._id,
        name:        zone.name,
        description: zone.description,
        coordinates: zone.coordinates,
        area_km2:    zone.area_km2,
        lastScan:    latestScan?.scanDate ?? null,
        forestPct:   latestScan?.results?.forestPercentage ?? null,
        severity:    latestScan?.results?.severity ?? 'unknown',
        alertCount,
      };
    }));

    res.json({ success: true, count: zonesWithStats.length, data: zonesWithStats });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};


// ── GET /api/public/alerts ────────────────────────────────────────────────────
export const getPublicAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await Alert.find({ severity: { $in: ['HIGH', 'CRITICAL'] } })
      .populate('zoneId', 'name coordinates')
      .sort({ createdAt: -1 })
      .limit(20)
      .select('zoneId severity forestLoss message changeType probableCause changedAreas createdAt');

    const publicAlerts = alerts.map(a => ({
      zone:         (a.zoneId as any)?.name ?? 'Unknown',
      coordinates:  (a.zoneId as any)?.coordinates ?? null,
      severity:     a.severity,
      forestLoss:   `${a.forestLoss}%`,
      message:      a.message,
      changeType:   (a as any).changeType || null,
      probableCause:(a as any).probableCause || null,
      changedAreas: (a as any).changedAreas || [],
      date:         a.createdAt,
    }));

    res.json({ success: true, count: publicAlerts.length, data: publicAlerts });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};
