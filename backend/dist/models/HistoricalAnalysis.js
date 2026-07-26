"use strict";
/**
 * HistoricalAnalysis Model
 * ------------------------
 * Saves completed historical analysis results to MongoDB.
 * Includes per-scan data, NDVI metrics, image paths (served via ML static server),
 * summary statistics, and AI verdict.
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
const mongoose_1 = __importStar(require("mongoose"));
// ── Schema ────────────────────────────────────────────────────────────────────
const HistoricalScanSchema = new mongoose_1.Schema({
    date: { type: String, required: true },
    status: { type: String, enum: ['done', 'skipped'], default: 'done' },
    skip_reason: { type: String, default: '' },
    ndvi_mean: { type: Number, default: 0 },
    forest_pct: { type: Number, default: 0 },
    vegetation_pct: { type: Number, default: 0 },
    water_pct: { type: Number, default: 0 },
    bare_soil_pct: { type: Number, default: 0 },
    cloud_pct: { type: Number, default: 0 },
    threats: [{ type: String }],
    severity: { type: String, default: 'none' },
    description: { type: String, default: '' },
    image_url: { type: String, default: '' },
    heatmap_url: { type: String, default: '' },
    delta_from_first: { type: Number, default: 0 },
    loss_hectares: { type: Number, default: 0 },
}, { _id: false });
const HistoricalSummarySchema = new mongoose_1.Schema({
    total_loss_pct: { type: Number, default: 0 },
    total_loss_ha: { type: Number, default: 0 },
    rate_per_year: { type: Number, default: 0 },
    biggest_drop_pct: { type: Number, default: 0 },
    biggest_drop_date: { type: String, default: '' },
    scans_done: { type: Number, default: 0 },
    scans_skipped: { type: Number, default: 0 },
}, { _id: false });
const HistoricalAnalysisSchema = new mongoose_1.Schema({
    zoneId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Zone', required: true },
    zoneName: { type: String, required: true },
    bbox: [{ type: Number }],
    dates: [{ type: String }],
    resolution: { type: Number, default: 20 },
    scans: [HistoricalScanSchema],
    summary: { type: HistoricalSummarySchema, default: () => ({}) },
    ai_verdict: { type: String, default: '' },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
// Index for fast user-specific queries
HistoricalAnalysisSchema.index({ createdBy: 1, createdAt: -1 });
HistoricalAnalysisSchema.index({ zoneId: 1 });
exports.default = mongoose_1.default.model('HistoricalAnalysis', HistoricalAnalysisSchema);
//# sourceMappingURL=HistoricalAnalysis.js.map