import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Scan from '../models/Scan';
import Zone from '../models/Zone';
import { AuthRequest } from '../middleware/auth.middleware';
import { processScanJob } from '../scheduler/scanProcessor';
import { publishScanJob } from '../scheduler/autoScan.scheduler';
import env from '../config/env';
import { broadcastScanUpdate } from '../utils/socket';

// ── Date helpers ─────────────────────────────────────────────
const formatDate = (d: Date): string => d.toISOString().split('T')[0];
const getDefaultDateFrom = (): string => {
  const d = new Date();
  // 45 din ka window — monsoon/cloud cover handle karne ke liye
  // Sentinel-2 leastCC mosaicking best clear image choose karega
  d.setDate(d.getDate() - 45);
  return formatDate(d);
};

// ── POST /api/scans/trigger — Manual scan start ──────────────
export const triggerScan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { zoneId, dateFrom, dateTo } = req.body;

    if (!zoneId) {
      res.status(400).json({ success: false, message: 'zoneId required' });
      return;
    }

    const zone = await Zone.findById(zoneId);
    if (!zone) {
      res.status(404).json({ success: false, message: 'Zone not found' });
      return;
    }

    if (!zone.bbox) {
      res.status(400).json({ success: false, message: 'Zone bbox not configured' });
      return;
    }

    const jobId = uuidv4();
    const from  = dateFrom || getDefaultDateFrom();
    const to    = dateTo   || formatDate(new Date());

    // Kafka job
    const job = {
      job_id:     jobId,
      zone_id:    zone._id.toString(),
      zone_name:  zone.name,
      bbox:       [zone.bbox.lng_min, zone.bbox.lat_min,
                   zone.bbox.lng_max, zone.bbox.lat_max],
      date_from:  from,
      date_to:    to,
      resolution: zone.sentinelConfig?.resolution ?? 20,  // 20m = faster!
    };

    // Pending scan record banao
    const scan = await Scan.create({
      zoneId,
      jobId,
      imagePath: `sentinel://${zone.name}/${from}->${to}`,
      status:    'pending',
    });

    // Kafka pe publish karo
    // Background scan trigger
    processScanJob(job).catch(err => console.error(`[${jobId}] Background scan failed:`, err));

    console.log(`[${jobId}] Scan triggered | zone=${zone.name} | ${from} -> ${to}`);

    const populatedScan = await Scan.findById(scan._id).populate('zoneId', 'name bbox');
    if (populatedScan) {
      broadcastScanUpdate(populatedScan);
    }

    res.status(202).json({
      success: true,
      message: 'Scan job queued',
      data:    { scanId: scan._id, jobId, dateFrom: from, dateTo: to },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// ── GET /api/scans — All scans (optional zoneId filter) ────────
// URL: /api/scans?zone=<zoneId>&status=completed&limit=20
export const getAllScans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.zone)   filter.zoneId = req.query.zone;
    if (req.query.status) filter.status = req.query.status;

    const limit = parseInt(req.query.limit as string) || 50;

    const scans = await Scan.find(filter)
      .populate('zoneId', 'name bbox')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, count: scans.length, data: scans });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// ── GET /api/scans/zone/:id ─────────────────────────────────────────
export const getScansByZone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scans = await Scan.find({ zoneId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, count: scans.length, data: scans });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// ── GET /api/scans/:id ───────────────────────────────────────
export const getScan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scan = await Scan.findById(req.params.id).populate('zoneId');
    if (!scan) { res.status(404).json({ success: false, message: 'Scan not found' }); return; }
    res.json({ success: true, data: scan });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// ── GET /api/scans/compare/:id1/:id2 ────────────────────────
export const compareScans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [scan1, scan2] = await Promise.all([
      Scan.findById(req.params.id1),
      Scan.findById(req.params.id2),
    ]);

    if (!scan1 || !scan2) {
      res.status(404).json({ success: false, message: 'One or both scans not found' });
      return;
    }

    const forestLoss = scan1.results.forestPercentage - scan2.results.forestPercentage;

    res.json({
      success: true,
      data: {
        before:               { scanId: scan1._id, date: scan1.scanDate, forestPct: scan1.results.forestPercentage },
        after:                { scanId: scan2._id, date: scan2.scanDate, forestPct: scan2.results.forestPercentage },
        forestLoss:           parseFloat(forestLoss.toFixed(2)),
        deforestationDetected: forestLoss > 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// ── POST /api/scans/:id/retry ─────────────────────────────────────────
// Failed scan ko dobara queue karo
export const retryScan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) { res.status(404).json({ success: false, message: 'Scan not found' }); return; }

    if (scan.status === 'completed') {
      res.status(400).json({ success: false, message: 'Scan already completed — no retry needed' });
      return;
    }
    if (scan.status === 'processing') {
      res.status(400).json({ success: false, message: 'Scan is currently processing — wait for it to complete' });
      return;
    }

    // Reset scan status
    await Scan.findByIdAndUpdate(scan._id, {
      status:     'pending',
      failedAt:   null,
      failReason: '',
    });

    // Re-publish to Kafka
    const newJobId = await publishScanJob(scan.zoneId.toString());

    console.log(`[${scan.jobId}] Retry requested -> new job: ${newJobId}`);

    const updatedScan = await Scan.findById(scan._id).populate('zoneId', 'name bbox');
    if (updatedScan) {
      broadcastScanUpdate(updatedScan);
    }

    res.json({
      success: true,
      message: 'Scan re-queued successfully',
      data:    { originalJobId: scan.jobId, newJobId },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── POST /api/scans/trigger-all ───────────────────────────────────────────
// Manually trigger scans for ALL active zones (Batch Operation)
export const triggerAllScans = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zones = await Zone.find({ isActive: true });
    
    if (zones.length === 0) {
      res.status(400).json({ success: false, message: 'No active zones found to scan' });
      return;
    }

    const jobIds = await Promise.all(
      zones.map(zone => publishScanJob(zone._id.toString()))
    );

    const successfulJobs = jobIds.filter(id => id !== null);

    res.json({
      success: true,
      message: `Triggered scans for ${successfulJobs.length} out of ${zones.length} active zones.`,
      data: {
        totalZones: zones.length,
        queuedJobs: successfulJobs.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};
