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

import { Response }        from 'express';
import { AuthRequest }     from '../middleware/auth.middleware';
import Zone                from '../models/Zone';
import Scan                from '../models/Scan';
import Alert               from '../models/Alert';
import HistoricalAnalysis  from '../models/HistoricalAnalysis';
import FieldReport         from '../models/FieldReport';

// Helper to escape CSV strings
const escapeCSV = (field: any): string => {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// ── GET /api/export/zone/:id/csv ─────────────────────────────────────────────
export const exportZoneScansCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    const scans = await Scan.find({ zoneId: req.params.id, status: 'completed' })
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
        escapeCSV((r?.threats as string[] || []).join(', ')),
        r?.severity || 'none',
        escapeCSV(r?.description || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="EcoWatch_${zone.name.replace(/\s+/g, '_')}_Scans.csv"`);
    res.send(csvContent);

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/export/alerts/csv ──────────────────────────────────────────────
export const exportAlertsCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userZones = await Zone.find({ createdBy: req.user?.id, isActive: true }).select('_id name');
    const zoneIds   = userZones.map(z => z._id);
    const zoneMap   = Object.fromEntries(userZones.map(z => [z._id.toString(), z.name]));

    // ── Formal Alerts ─────────────────────────────────────────────────────────
    const alerts = await Alert.find({ zoneId: { $in: zoneIds } }).sort({ createdAt: -1 });

    // ── Scans with threats ────────────────────────────────────────────────────
    const scans = await Scan.find({
      zoneId: { $in: zoneIds },
      status: 'completed',
      'results.threats': { $exists: true, $not: { $size: 0 } },
    }).sort({ createdAt: -1 });

    // ── Historical scans with threats ─────────────────────────────────────────
    const analyses = await HistoricalAnalysis.find({ zoneId: { $in: zoneIds } }).sort({ createdAt: -1 });

    const headers = [
      'Source', 'Date', 'Zone Name', 'Severity',
      'Forest Loss %', 'Threats Detected', 'Description / Message'
    ];

    const rows: string[] = [];

    // Add formal alerts
    for (const a of alerts) {
      rows.push([
        'Alert',
        a.createdAt.toISOString().split('T')[0],
        escapeCSV(zoneMap[(a.zoneId as any).toString()] || 'Unknown'),
        a.severity,
        a.forestLoss || '0',
        '',
        escapeCSV(a.message || ''),
      ].join(','));
    }

    // Add regular scans with threats
    for (const s of scans) {
      const threats = (s.results?.threats as string[] || []).filter(t => t && t !== 'none');
      if (threats.length === 0) continue;
      rows.push([
        'Scan',
        (s.scanDate || s.createdAt).toISOString().split('T')[0],
        escapeCSV(zoneMap[(s.zoneId as any).toString()] || 'Unknown'),
        s.results?.severity || 'none',
        '0',
        escapeCSV(threats.join(', ')),
        escapeCSV(s.results?.description || ''),
      ].join(','));
    }

    // Add historical scan entries with threats
    for (const a of analyses) {
      for (const scan of (a.scans || []) as any[]) {
        if (scan.status !== 'done') continue;
        const threats = (scan.threats || []).filter((t: string) => t && t !== 'none');
        if (threats.length === 0) continue;
        rows.push([
          'Historical',
          scan.date || '',
          escapeCSV((a as any).zoneName || 'Unknown'),
          scan.severity || 'none',
          (scan.delta_from_first ?? 0).toFixed(2),
          escapeCSV(threats.join(', ')),
          escapeCSV(scan.description || ''),
        ].join(','));
      }
    }

    if (rows.length === 0) {
      // No threats at all — return informational CSV
      rows.push(['No threats detected yet across any zones','','','','','',''].join(','));
    }

    const csvContent = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="EcoWatch_Global_Threat_Log.csv"');
    res.send(csvContent);

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
};


// ── GET /api/export/zone/:id/stats ───────────────────────────────────────────
export const getZoneExportStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zoneId = req.params.id;
    const [scanCount, alertCount, fieldCount, histCount] = await Promise.all([
      Scan.countDocuments({ zoneId, status: 'completed' }),
      Alert.countDocuments({ zoneId }),
      FieldReport.countDocuments({ zoneId }),
      HistoricalAnalysis.countDocuments({ zoneId }),
    ]);
    res.json({ success: true, data: { scanCount, alertCount, fieldCount, histCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/export/zone/:id/historical/csv ──────────────────────────────────
export const exportZoneHistoricalCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    const analyses = await HistoricalAnalysis.find({ zoneId: req.params.id }).sort({ createdAt: -1 });

    const headers = [
      'Analysis Date', 'Scan Date', 'Status', 'Forest %', 'Vegetation %',
      'Bare Soil %', 'Water %', 'NDVI Mean', 'Cloud Masked %',
      'Threats', 'Severity', 'Delta from Baseline %', 'Description'
    ];

    const rows: string[] = [];
    analyses.forEach((a: any) => {
      (a.scans || []).forEach((s: any) => {
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
          escapeCSV((s.threats || []).filter((t: string) => t !== 'none').join(', ')),
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
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/export/zone/:id/field/csv ──────────────────────────────────────
export const exportZoneFieldReportsCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    const reports = await FieldReport.find({ zoneId: req.params.id }).sort({ createdAt: -1 });

    const headers = [
      'Report Date', 'Reporter', 'GPS Lat', 'GPS Lng',
      'Status', 'AI Severity', 'AI Threats', 'AI Confidence', 'Field Notes', 'AI Description'
    ];

    const rows = reports.map((r: any) => [
      new Date(r.createdAt).toISOString().split('T')[0],
      escapeCSV(r.reporterName || ''),
      r.gps?.lat?.toFixed(6) || '0',
      r.gps?.lng?.toFixed(6) || '0',
      r.status || 'pending',
      r.aiAnalysis?.severity || 'pending',
      escapeCSV((r.aiAnalysis?.threats || []).filter((t: string) => t !== 'none').join(', ')),
      r.aiAnalysis?.confidence || 'N/A',
      escapeCSV(r.notes || ''),
      escapeCSV(r.aiAnalysis?.description || ''),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="EcoWatch_${zone.name.replace(/\s+/g, '_')}_FieldReports.csv"`);
    res.send(csv);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/export/historical/csv  (ALL zones) ──────────────────────────────
export const exportAllHistoricalCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analyses = await HistoricalAnalysis.find().populate('zoneId', 'name').sort({ createdAt: -1 });

    const headers = [
      'Zone Name', 'Analysis Date', 'Scan Date', 'Status', 'Forest %',
      'Vegetation %', 'Bare Soil %', 'Water %', 'NDVI Mean', 'Cloud %',
      'Threats', 'Severity', 'Delta %'
    ];

    const rows: string[] = [];
    analyses.forEach((a: any) => {
      const zoneName = a.zoneId?.name || 'Unknown';
      (a.scans || []).forEach((s: any) => {
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
          escapeCSV((s.threats || []).filter((t: string) => t !== 'none').join(', ')),
          s.severity || 'none',
          (s.delta_from_first ?? 0).toFixed(2),
        ].join(','));
      });
    });

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="EcoWatch_All_Historical.csv"');
    res.send(csv);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/export/field/csv  (ALL zones) ───────────────────────────────────
export const exportAllFieldReportsCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reports = await FieldReport.find().populate('zoneId', 'name').sort({ createdAt: -1 });

    const headers = [
      'Zone Name', 'Report Date', 'Reporter', 'GPS Lat', 'GPS Lng',
      'Status', 'AI Severity', 'AI Threats', 'AI Confidence', 'Field Notes', 'AI Description'
    ];

    const rows = reports.map((r: any) => [
      escapeCSV(r.zoneId?.name || 'Unknown'),
      new Date(r.createdAt).toISOString().split('T')[0],
      escapeCSV(r.reporterName || ''),
      r.gps?.lat?.toFixed(6) || '0',
      r.gps?.lng?.toFixed(6) || '0',
      r.status || 'pending',
      r.aiAnalysis?.severity || 'pending',
      escapeCSV((r.aiAnalysis?.threats || []).filter((t: string) => t !== 'none').join(', ')),
      r.aiAnalysis?.confidence || 'N/A',
      escapeCSV(r.notes || ''),
      escapeCSV(r.aiAnalysis?.description || ''),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="EcoWatch_All_FieldReports.csv"');
    res.send(csv);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
};
