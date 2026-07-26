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
const ScanSchema = new mongoose_1.Schema({
    zoneId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Zone', required: true },
    jobId: { type: String, required: true, unique: true },
    scanDate: { type: Date, default: Date.now },
    imagePath: { type: String, required: true },
    results: {
        // NDVI metrics
        forestPercentage: { type: Number, default: 0 },
        vegetationPercentage: { type: Number, default: 0 },
        bareSoilPercentage: { type: Number, default: 0 },
        waterPercentage: { type: Number, default: 0 },
        ndviMean: { type: Number, default: 0 },
        ndviMin: { type: Number, default: 0 },
        ndviMax: { type: Number, default: 0 },
        // GPT-4o Vision analysis
        threats: { type: [String], default: ['none'] },
        severity: { type: String, default: 'none' },
        description: { type: String, default: '' },
        affectedAreas: { type: [String], default: [] },
        forestVisible: { type: Boolean, default: false },
        vlConfidence: { type: String, default: 'low' },
        // Combined
        deforestationDetected: { type: Boolean, default: false },
        heatmapPath: { type: String, default: '' },
        originalImagePath: { type: String, default: '' }, // Comparison ke liye
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
    },
    failedAt: { type: Date, default: null },
    failReason: { type: String, default: '' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('Scan', ScanSchema);
//# sourceMappingURL=Scan.js.map