"use strict";
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
// ── Schema ───────────────────────────────────────────────────────────────────
const CampaignScanSchema = new mongoose_1.Schema({
    scheduledDate: { type: Date, required: true },
    actualDate: { type: Date, default: null },
    scanId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Scan', default: null },
    status: { type: String, enum: ['pending', 'processing', 'done', 'skipped'], default: 'pending' },
    skipReason: { type: String, default: '' },
    isBaseline: { type: Boolean, default: false },
    ndvi: { type: Number, default: 0 },
    forestPct: { type: Number, default: 0 },
    deltaFromBaseline: { type: Number, default: 0 },
    deltaFromPrevious: { type: Number, default: 0 },
    lossHectares: { type: Number, default: 0 },
    alertSent: { type: Boolean, default: false },
}, { _id: false });
const CampaignReportSchema = new mongoose_1.Schema({
    totalLossPct: { type: Number, default: 0 },
    totalLossHa: { type: Number, default: 0 },
    ratePerYear: { type: Number, default: 0 },
    biggestDropPct: { type: Number, default: 0 },
    biggestDropIndex: { type: Number, default: 0 },
    aiVerdict: { type: String, default: '' },
    generatedAt: { type: Date, default: Date.now },
}, { _id: false });
const CampaignSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    zoneId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Zone', required: true },
    bbox: { type: [Number], required: true },
    areaKm2: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    scanDates: { type: [Date], default: [] },
    scanCount: { type: Number, default: 4, min: 2, max: 10 },
    resolution: { type: Number, default: 20, enum: [10, 20, 30] },
    maxCloudCover: { type: Number, default: 50, min: 0, max: 100 },
    retryIfCloudy: { type: Boolean, default: true },
    alertEmail: { type: String, default: '' },
    alertThreshold: { type: Number, default: 10, min: 1, max: 50 },
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
    scans: { type: [CampaignScanSchema], default: [] },
    currentScanIdx: { type: Number, default: 0 },
    finalReport: { type: CampaignReportSchema, default: null },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
exports.default = mongoose_1.default.model('Campaign', CampaignSchema);
//# sourceMappingURL=Campaign.js.map