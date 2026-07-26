"use strict";
/**
 * Scan Analysis Routes (replaces ML service HTTP endpoints)
 * -----------------------------------------------------------
 * POST /api/scan/analyze    → Manual zone analysis (Sentinel Hub + NDVI + GPT-4o)
 * POST /api/scan/compare    → Deep dual-image comparison via GPT-4o
 * GET  /api/scan/health     → Service health (Sentinel Hub + OpenAI status)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const sentinelHub_1 = require("../services/sentinelHub");
const ndvi_1 = require("../services/ndvi");
const visionAnalysis_1 = require("../services/visionAnalysis");
const imageService_1 = require("../services/imageService");
const sentinelHub = __importStar(require("../services/sentinelHub"));
const visionApi = __importStar(require("../services/visionAnalysis"));
const router = (0, express_1.Router)();
// ── GET /api/scan/health ─────────────────────────────────────────────────────
router.get('/health', async (_req, res) => {
    const [shOk, visionOk] = await Promise.all([
        sentinelHub.healthCheck().catch(() => false),
        visionApi.healthCheck().catch(() => false),
    ]);
    res.json({
        status: 'ok',
        sentinel_hub: shOk ? 'connected' : 'disconnected',
        vision_api: visionOk ? 'connected' : 'disconnected',
        model: 'OpenAI GPT-4o Vision',
        version: '3.0.0',
    });
});
// ── POST /api/scan/analyze ───────────────────────────────────────────────────
router.post('/analyze', async (req, res) => {
    try {
        const { zone_id, bbox, date_from, date_to, resolution = 20, job_id } = req.body;
        if (!zone_id || !bbox || !date_from || !date_to) {
            res.status(400).json({ success: false, message: 'zone_id, bbox, date_from, date_to required' });
            return;
        }
        const jobId = job_id || (0, uuid_1.v4)().slice(0, 8);
        // 1. Fetch from Sentinel Hub
        const imageData = await (0, sentinelHub_1.fetchImage)({ bbox, dateFrom: date_from, dateTo: date_to, resolution });
        // 2. NDVI calculation
        const ndviResult = (0, ndvi_1.calculateNdvi)(imageData.nir, imageData.redRaw, imageData.scl);
        // 3. Save original
        const origPath = (0, imageService_1.saveImage)(imageData.rgb, 'original', jobId);
        // 4. Heatmap
        let heatmapPath = '';
        try {
            const heatmapBuf = await (0, ndvi_1.generateNdviHeatmap)(imageData.rgb, imageData.nir, imageData.width, imageData.height);
            heatmapPath = (0, imageService_1.saveImage)(heatmapBuf, 'heatmap', jobId);
        }
        catch { }
        // 5. GPT-4o Vision analysis
        const imageBase64 = (0, imageService_1.imageToBase64)(origPath);
        const vlResult = await (0, visionAnalysis_1.analyzeImage)(imageBase64);
        // 6. Smart deforestation fusion
        const ndviForest = ndviResult.forestPct;
        const qwenDeforest = vlResult.threats.includes('deforestation') || vlResult.threats.includes('agricultural_expansion');
        let deforestationDetected = false;
        if (qwenDeforest) {
            deforestationDetected = true;
        }
        else if (ndviForest < 30.0 && vlResult.threats.some(t => t !== 'none')) {
            deforestationDetected = true;
        }
        else if (ndviForest < 10.0 && ndviResult.waterPct > 50.0) {
            deforestationDetected = false;
        }
        else if (ndviForest < 10.0 && !vlResult.forestVisible) {
            deforestationDetected = true;
        }
        else if (ndviForest < 5.0 && ndviResult.waterPct < 30.0) {
            deforestationDetected = true;
        }
        res.json({
            job_id: jobId,
            zone_id,
            forest_percentage: ndviResult.forestPct,
            vegetation_percentage: ndviResult.vegetationPct,
            bare_soil_percentage: ndviResult.bareSoilPct,
            water_percentage: ndviResult.waterPct,
            ndvi_mean: ndviResult.ndviMean,
            ndvi_min: ndviResult.ndviMin,
            ndvi_max: ndviResult.ndviMax,
            threats: vlResult.threats,
            severity: vlResult.severity,
            description: vlResult.description,
            affected_areas: vlResult.affectedAreas,
            forest_visible: vlResult.forestVisible,
            vl_confidence: vlResult.confidence,
            deforestation_detected: deforestationDetected,
            heatmap_path: heatmapPath,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message });
    }
});
// ── POST /api/scan/compare ───────────────────────────────────────────────────
router.post('/compare', async (req, res) => {
    try {
        const { image_path_old, image_path_new, forest_loss, job_id, bbox } = req.body;
        if (!image_path_old || !image_path_new) {
            res.status(400).json({ success: false, message: 'image_path_old and image_path_new required' });
            return;
        }
        const jobId = job_id || (0, uuid_1.v4)().slice(0, 8);
        const imgOldBase64 = (0, imageService_1.imageToBase64)(image_path_old);
        const imgNewBase64 = (0, imageService_1.imageToBase64)(image_path_new);
        const result = await (0, visionAnalysis_1.compareImages)(imgOldBase64, imgNewBase64);
        // Side-by-side image
        let comparisonImagePath = '';
        try {
            const sharp = require('sharp');
            const oldBuf = await sharp(image_path_old).resize(512, 512).toBuffer();
            const newBuf = await sharp(image_path_new).resize(512, 512).toBuffer();
            const combined = await sharp({
                create: { width: 1024, height: 512, channels: 3, background: { r: 30, g: 30, b: 30 } },
            }).composite([{ input: oldBuf, left: 0, top: 0 }, { input: newBuf, left: 512, top: 0 }]).png().toBuffer();
            comparisonImagePath = (0, imageService_1.saveImage)(combined, 'comparison', jobId);
        }
        catch { }
        // Hotspot calculation
        let hotspotLat = null;
        let hotspotLng = null;
        if (bbox?.length === 4) {
            try {
                const sharp = require('sharp');
                const oldBuf = await sharp(image_path_old).resize(256, 256).raw().toBuffer();
                const newBuf = await sharp(image_path_new).resize(256, 256).raw().toBuffer();
                const H = 256, W = 256;
                const diff = new Float32Array(H * W);
                for (let i = 0; i < H * W; i++) {
                    const oldGray = (oldBuf[i * 3] + oldBuf[i * 3 + 1] + oldBuf[i * 3 + 2]) / 3;
                    const newGray = (newBuf[i * 3] + newBuf[i * 3 + 1] + newBuf[i * 3 + 2]) / 3;
                    diff[i] = newGray - oldGray;
                }
                const sorted = Array.from(diff).sort((a, b) => b - a);
                const threshold = sorted[Math.floor(H * W * 0.05)] || 0;
                let sumX = 0, sumY = 0, count = 0;
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        if (diff[y * W + x] > threshold) {
                            sumX += x;
                            sumY += y;
                            count++;
                        }
                    }
                }
                if (count > 0) {
                    const cx = sumX / count, cy = sumY / count;
                    hotspotLng = bbox[0] + (cx / W) * (bbox[2] - bbox[0]);
                    hotspotLat = bbox[3] - (cy / H) * (bbox[3] - bbox[1]);
                }
            }
            catch { }
        }
        res.json({
            job_id: jobId,
            forest_loss: forest_loss || 0,
            change_detected: result.changeDetected,
            change_type: result.changeType,
            severity: result.severity,
            changed_areas: result.changedAreas,
            change_description: result.changeDescription,
            probable_cause: result.probableCause,
            comparison_image_path: comparisonImagePath,
            hotspot_lat: hotspotLat,
            hotspot_lng: hotspotLng,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message });
    }
});
exports.default = router;
//# sourceMappingURL=scanAnalysis.routes.js.map