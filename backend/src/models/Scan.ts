import mongoose, { Document, Schema } from 'mongoose';

// ── Result interface — NDVI + GPT-4o Vision ───────────────────────
interface IScanResults {
  // NDVI metrics (physics-based, exact percentages)
  forestPercentage:     number;
  vegetationPercentage: number;
  bareSoilPercentage:   number;
  waterPercentage:      number;
  ndviMean:             number;
  ndviMin:              number;
  ndviMax:              number;

  // GPT-4o Vision analysis (AI threat detection)
  threats:              string[];   // ["deforestation", "illegal_mining", ...]
  severity:             string;     // "none"|"low"|"medium"|"high"|"critical"
  description:          string;     // Detailed text description
  affectedAreas:        string[];   // ["northeast", "center", ...]
  forestVisible:        boolean;
  vlConfidence:         string;     // "low"|"medium"|"high"

  // Combined
  deforestationDetected: boolean;
  heatmapPath:           string;
}

export interface IScan extends Document {
  zoneId:     mongoose.Types.ObjectId;
  jobId:      string;
  scanDate:   Date;
  imagePath:  string;
  results:    IScanResults;
  status:     'pending' | 'processing' | 'completed' | 'failed';
  failedAt:   Date | null;
  failReason: string;
  createdAt:  Date;
}

const ScanSchema = new Schema<IScan>({
  zoneId:    { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
  jobId:     { type: String, required: true, unique: true },
  scanDate:  { type: Date, default: Date.now },
  imagePath: { type: String, required: true },
  results: {
    // NDVI metrics
    forestPercentage:     { type: Number, default: 0 },
    vegetationPercentage: { type: Number, default: 0 },
    bareSoilPercentage:   { type: Number, default: 0 },
    waterPercentage:      { type: Number, default: 0 },
    ndviMean:             { type: Number, default: 0 },
    ndviMin:              { type: Number, default: 0 },
    ndviMax:              { type: Number, default: 0 },

    // GPT-4o Vision analysis
    threats:              { type: [String], default: ['none'] },
    severity:             { type: String,   default: 'none' },
    description:          { type: String,   default: '' },
    affectedAreas:        { type: [String], default: [] },
    forestVisible:        { type: Boolean,  default: false },
    vlConfidence:         { type: String,   default: 'low' },

    // Combined
    deforestationDetected: { type: Boolean, default: false },
    heatmapPath:           { type: String,  default: '' },
    originalImagePath:     { type: String,  default: '' },   // Comparison ke liye
  },
  status: {
    type:    String,
    enum:    ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  failedAt:   { type: Date,   default: null },
  failReason: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model<IScan>('Scan', ScanSchema);
