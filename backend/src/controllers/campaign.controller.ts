/**
 * Campaign Controller
 * -------------------
 * Monitoring Campaign ke liye CRUD + preview-dates utility
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Campaign from '../models/Campaign';
import Zone from '../models/Zone';

// ── Utility: Calculate evenly-distributed scan dates ────────────────────────
export const calculateScanDates = (
  startDate: Date,
  endDate: Date,
  count: number,
): Date[] => {
  const dates: Date[] = [];
  const totalMs = endDate.getTime() - startDate.getTime();
  const MIN_GAP_MS = 5 * 24 * 60 * 60 * 1000; // 5 days minimum

  if (count === 1) {
    dates.push(new Date(startDate));
    return dates;
  }

  const gapMs = totalMs / (count - 1);

  // Enforce minimum 5 day gap
  if (gapMs < MIN_GAP_MS) {
    // Recalculate count based on min gap
    const maxCount = Math.floor(totalMs / MIN_GAP_MS) + 1;
    const actualCount = Math.min(count, maxCount);
    const actualGapMs = totalMs / (actualCount - 1);
    for (let i = 0; i < actualCount; i++) {
      dates.push(new Date(startDate.getTime() + i * actualGapMs));
    }
    return dates;
  }

  for (let i = 0; i < count; i++) {
    dates.push(new Date(startDate.getTime() + i * gapMs));
  }
  return dates;
};

// ── Utility: Calculate area in km² from bbox ────────────────────────────────
export const calculateAreaKm2 = (bbox: number[]): number => {
  const [lngMin, latMin, lngMax, latMax] = bbox;
  const latMid = (latMin + latMax) / 2;
  const widthKm = Math.abs(lngMax - lngMin) * 111.32 * Math.cos((latMid * Math.PI) / 180);
  const heightKm = Math.abs(latMax - latMin) * 110.574;
  return parseFloat((widthKm * heightKm).toFixed(2));
};

// ── POST /api/campaigns/preview-dates ───────────────────────────────────────
// Pure calculation — no DB write. Returns dates + metadata.
export const previewDates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, scanCount, bbox } = req.body;

    if (!startDate || !endDate || !scanCount) {
      res.status(400).json({ success: false, message: 'startDate, endDate, scanCount required' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const count = parseInt(scanCount);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid date format' });
      return;
    }
    if (start >= end) {
      res.status(400).json({ success: false, message: 'startDate must be before endDate' });
      return;
    }
    if (count < 2 || count > 10) {
      res.status(400).json({ success: false, message: 'scanCount must be between 2 and 10' });
      return;
    }

    // Sentinel-2 archive check: must be after June 2015
    const SENTINEL2_START = new Date('2015-06-01');
    const isHistorical = end <= new Date();

    if (isHistorical && start < SENTINEL2_START) {
      res.status(400).json({
        success: false,
        message: 'Sentinel-2 data available only from June 2015 onwards',
      });
      return;
    }

    const dates = calculateScanDates(start, end, count);
    const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const gapDays = dates.length > 1
      ? Math.round((dates[1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24))
      : totalDays;

    // Area warning
    let areaWarning = null;
    if (bbox && Array.isArray(bbox)) {
      const areaKm2 = calculateAreaKm2(bbox);
      if (areaKm2 > 500) {
        areaWarning = `Zone area (${areaKm2} km²) is large. Consider using 20m or 30m resolution to save API quota.`;
      }
    }

    res.json({
      success: true,
      data: {
        mode: isHistorical ? 'historical' : 'monitoring',
        dates: dates.map(d => d.toISOString().split('T')[0]),
        scanCount: dates.length,
        totalDays,
        gapDays,
        areaWarning,
        note: dates.length < count
          ? `Scan count reduced to ${dates.length} due to minimum 5-day gap requirement`
          : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── POST /api/campaigns ──────────────────────────────────────────────────────
export const createCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name, zoneId, startDate, endDate, scanCount,
      resolution, maxCloudCover, retryIfCloudy,
      alertEmail, alertThreshold,
    } = req.body;

    if (!name || !zoneId || !startDate || !endDate || !scanCount) {
      res.status(400).json({ success: false, message: 'name, zoneId, startDate, endDate, scanCount required' });
      return;
    }

    const zone = await Zone.findById(zoneId);
    if (!zone || !zone.bbox) {
      res.status(404).json({ success: false, message: 'Zone not found or bbox not configured' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const count = parseInt(scanCount);

    if (start >= end) {
      res.status(400).json({ success: false, message: 'startDate must be before endDate' });
      return;
    }

    const bbox = [zone.bbox.lng_min, zone.bbox.lat_min, zone.bbox.lng_max, zone.bbox.lat_max];
    const areaKm2 = calculateAreaKm2(bbox);
    const dates = calculateScanDates(start, end, Math.min(count, 10));

    // ── Future-dates validation (Monitoring mode) ───────────────────────────
    // scan[0] = baseline (can be today or near-today)
    // scan[1..n] must be strictly in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 1; i < dates.length; i++) {
      const d = new Date(dates[i]);
      d.setHours(0, 0, 0, 0);
      if (d <= today) {
        res.status(400).json({
          success: false,
          message: `Scan ${i + 1} date (${dates[i].toISOString().split('T')[0]}) must be in the future. Monitoring campaigns only allow future scan dates.`,
        });
        return;
      }
    }

    // Build scan slot entries
    const scans = dates.map((date, idx) => ({
      scheduledDate: date,
      actualDate: null,
      scanId: null,
      status: 'pending' as const,
      skipReason: '',
      isBaseline: idx === 0,
      ndvi: 0,
      forestPct: 0,
      deltaFromBaseline: 0,
      deltaFromPrevious: 0,
      lossHectares: 0,
      alertSent: false,
    }));

    const campaign = await Campaign.create({
      name,
      zoneId,
      bbox,
      areaKm2,
      startDate: start,
      endDate: end,
      scanDates: dates,
      scanCount: dates.length,
      resolution: resolution ?? 20,
      maxCloudCover: maxCloudCover ?? 50,
      retryIfCloudy: retryIfCloudy ?? true,
      alertEmail: alertEmail ?? '',
      alertThreshold: alertThreshold ?? 10,
      status: 'active',
      scans,
      currentScanIdx: 0,
      createdBy: req.user?.id,
    });

    res.status(201).json({
      success: true,
      message: `Campaign created! Baseline scan running now. ${dates.length - 1} future scan(s) scheduled.`,
      data: campaign,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/campaigns ───────────────────────────────────────────────────────
export const getCampaigns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user?.id })
      .populate('zoneId', 'name bbox area_km2')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/campaigns/:id ───────────────────────────────────────────────────
export const getCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('zoneId', 'name bbox area_km2')
      .populate('scans.scanId');

    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── PATCH /api/campaigns/:id/pause ──────────────────────────────────────────
export const togglePause = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }
    if (campaign.status === 'completed') {
      res.status(400).json({ success: false, message: 'Completed campaigns cannot be paused' });
      return;
    }
    campaign.status = campaign.status === 'paused' ? 'active' : 'paused';
    await campaign.save();
    res.json({ success: true, message: `Campaign ${campaign.status}`, data: { status: campaign.status } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── DELETE /api/campaigns/:id ────────────────────────────────────────────────
export const deleteCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      res.status(404).json({ success: false, message: 'Campaign not found' });
      return;
    }
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};
