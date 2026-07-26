"use strict";
/**
 * Historical Analysis Controller
 * --------------------------------
 * Save, list, fetch, and delete historical analysis records.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAnalysis = exports.getAnalysesByZone = exports.getAnalysis = exports.getAnalyses = exports.saveAnalysis = void 0;
const HistoricalAnalysis_1 = __importDefault(require("../models/HistoricalAnalysis"));
const imageService_1 = require("../services/imageService");
// ── POST /api/historical ──────────────────────────────────────────────────────
// Save a completed historical analysis to MongoDB
const saveAnalysis = async (req, res) => {
    try {
        const { zoneId, zoneName, bbox, dates, resolution, scans, summary, ai_verdict, } = req.body;
        if (!zoneId || !zoneName || !scans || !Array.isArray(scans)) {
            res.status(400).json({ success: false, message: 'zoneId, zoneName, scans required' });
            return;
        }
        // Convert local file paths to accessible URLs
        const normalizedScans = scans.map((s) => ({
            ...s,
            image_url: (0, imageService_1.toImageUrl)(s.image_path || s.image_url || ''),
            heatmap_url: (0, imageService_1.toImageUrl)(s.heatmap_path || s.heatmap_url || ''),
        }));
        const analysis = await HistoricalAnalysis_1.default.create({
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.saveAnalysis = saveAnalysis;
// ── GET /api/historical ───────────────────────────────────────────────────────
// List all analyses for current user (summary — no full scan data)
const getAnalyses = async (req, res) => {
    try {
        const analyses = await HistoricalAnalysis_1.default
            .find({ createdBy: req.user?.id })
            .select('zoneId zoneName dates resolution summary ai_verdict createdAt')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, count: analyses.length, data: analyses });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getAnalyses = getAnalyses;
// ── GET /api/historical/:id ───────────────────────────────────────────────────
// Full analysis detail including all scans and images
const getAnalysis = async (req, res) => {
    try {
        const analysis = await HistoricalAnalysis_1.default.findOne({
            _id: req.params.id,
            createdBy: req.user?.id,
        });
        if (!analysis) {
            res.status(404).json({ success: false, message: 'Analysis not found' });
            return;
        }
        res.json({ success: true, data: analysis });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getAnalysis = getAnalysis;
// ── GET /api/historical/zone/:zoneId ─────────────────────────────────────────
// All analyses for a specific zone
const getAnalysesByZone = async (req, res) => {
    try {
        const analyses = await HistoricalAnalysis_1.default
            .find({ zoneId: req.params.zoneId, createdBy: req.user?.id })
            .sort({ createdAt: -1 });
        res.json({ success: true, count: analyses.length, data: analyses });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.getAnalysesByZone = getAnalysesByZone;
// ── DELETE /api/historical/:id ────────────────────────────────────────────────
const deleteAnalysis = async (req, res) => {
    try {
        const analysis = await HistoricalAnalysis_1.default.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user?.id,
        });
        if (!analysis) {
            res.status(404).json({ success: false, message: 'Analysis not found' });
            return;
        }
        res.json({ success: true, message: 'Analysis deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.deleteAnalysis = deleteAnalysis;
//# sourceMappingURL=historical.controller.js.map