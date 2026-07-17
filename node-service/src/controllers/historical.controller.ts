/**
 * Historical Analysis Controller
 * --------------------------------
 * Save, list, fetch, and delete historical analysis records.
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import HistoricalAnalysis from '../models/HistoricalAnalysis';

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// ── Helper: Convert local image path to publicly accessible URL ───────────────
const toImageUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path; // already a URL
  // Extract just the filename from absolute path
  const filename = path.replace(/\\/g, '/').split('/').pop() || '';
  return `${ML_BASE_URL}/images/${filename}`;
};

// ── POST /api/historical ──────────────────────────────────────────────────────
// Save a completed historical analysis to MongoDB
export const saveAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      zoneId, zoneName, bbox, dates, resolution,
      scans, summary, ai_verdict,
    } = req.body;

    if (!zoneId || !zoneName || !scans || !Array.isArray(scans)) {
      res.status(400).json({ success: false, message: 'zoneId, zoneName, scans required' });
      return;
    }

    // Convert local file paths to accessible URLs
    const normalizedScans = scans.map((s: any) => ({
      ...s,
      image_url: toImageUrl(s.image_path || s.image_url || ''),
      heatmap_url: toImageUrl(s.heatmap_path || s.heatmap_url || ''),
    }));

    const analysis = await HistoricalAnalysis.create({
      zoneId,
      zoneName,
      bbox: bbox || [],
      dates: dates || [],
      resolution: resolution || 20,
      scans: normalizedScans,
      summary: summary || {},
      ai_verdict: ai_verdict || '',
      createdBy: req.user?.id,
    });

    res.status(201).json({
      success: true,
      message: 'Historical analysis saved',
      data: analysis,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/historical ───────────────────────────────────────────────────────
// List all analyses for current user (summary — no full scan data)
export const getAnalyses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analyses = await HistoricalAnalysis
      .find({ createdBy: req.user?.id })
      .select('zoneId zoneName dates resolution summary ai_verdict createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: analyses.length, data: analyses });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/historical/:id ───────────────────────────────────────────────────
// Full analysis detail including all scans and images
export const getAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analysis = await HistoricalAnalysis.findOne({
      _id: req.params.id,
      createdBy: req.user?.id,
    });

    if (!analysis) {
      res.status(404).json({ success: false, message: 'Analysis not found' });
      return;
    }

    res.json({ success: true, data: analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/historical/zone/:zoneId ─────────────────────────────────────────
// All analyses for a specific zone
export const getAnalysesByZone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analyses = await HistoricalAnalysis
      .find({ zoneId: req.params.zoneId, createdBy: req.user?.id })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: analyses.length, data: analyses });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── DELETE /api/historical/:id ────────────────────────────────────────────────
export const deleteAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analysis = await HistoricalAnalysis.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user?.id,
    });

    if (!analysis) {
      res.status(404).json({ success: false, message: 'Analysis not found' });
      return;
    }

    res.json({ success: true, message: 'Analysis deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};
