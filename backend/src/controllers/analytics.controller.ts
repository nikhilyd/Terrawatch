/**
 * Analytics Controller
 * --------------------
 * GET /api/analytics/threat-distribution   → Pie chart data (logging vs mining vs fire etc)
 * GET /api/analytics/alerts-over-time      → Bar chart data (alerts per month/week)
 * GET /api/analytics/zone-comparisons      → Radar/Bar chart (comparing top zones by loss)
 */

import { Response } from 'express';
import Alert from '../models/Alert';
import Zone from '../models/Zone';
import Scan from '../models/Scan';
import HistoricalAnalysis from '../models/HistoricalAnalysis';
import { AuthRequest } from '../middleware/auth.middleware';

// ── GET /api/analytics/threat-distribution ──────────────────────────────────
export const getThreatDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userZones = await Zone.find({ createdBy: req.user?.id, isActive: true }).select('_id');
    const zoneIds   = userZones.map(z => z._id);

    const pipeline = [
      { $match: { status: 'completed', zoneId: { $in: zoneIds } } },
      { $unwind: '$results.threats' },
      { $match: { 'results.threats': { $ne: 'none' } } },
      { $group: { _id: '$results.threats', count: { $sum: 1 } } },
      { $sort: { count: -1 } as any }
    ];

    const stats = await Scan.aggregate(pipeline as any[]);
    
    // Format for Chart.js / Recharts
    const labels = stats.map(s => s._id.toUpperCase());
    const data   = stats.map(s => s.count);

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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/analytics/alerts-over-time ──────────────────────────────────────
export const getAlertsOverTime = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1); // Start of month

    // User ke zones filter
    const userZones = await Zone.find({ createdBy: req.user?.id, isActive: true }).select('_id');
    const zoneIds   = userZones.map(z => z._id);

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
      { $sort: { '_id.year': 1, '_id.month': 1 } as any }
    ];

    const rawData = await Alert.aggregate(pipeline);

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
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/analytics/threat-types ────────────────────────────────────────────
export const getThreatTypeBreakdown = async (_req: AuthRequest, res: Response): Promise<void> => {
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
      Scan.aggregate(scanPipeline as any[]),
      HistoricalAnalysis.aggregate(histPipeline as any[]),
    ]);

    const merged: Record<string, number> = {};
    [...scanStats, ...histStats].forEach((s: any) => {
      const key = (s._id as string).toLowerCase().replace(/\s+/g, '_');
      merged[key] = (merged[key] ?? 0) + s.count;
    });

    const sorted = Object.entries(merged)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    const THREAT_COLORS: Record<string, string> = {
      illegal_logging:    '#ef4444',
      encroachment:       '#f97316',
      deforestation:      '#dc2626',
      mining:             '#a16207',
      fire:               '#f59e0b',
      water_pollution:    '#3b82f6',
      industrialization:  '#8b5cf6',
      agriculture:        '#22c55e',
    };

    res.json({
      success: true,
      data: sorted.map(([threat, count]) => ({
        threat,
        count,
        color: THREAT_COLORS[threat] ?? '#6b7280',
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};
