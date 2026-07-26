import mongoose, { Document, Schema } from 'mongoose';

// ── Single scan entry within a campaign ──────────────────────────────────────
interface ICampaignScan {
  scheduledDate: Date;       // System ne calculate ki date
  actualDate:    Date | null; // Actual fetch date (retry ke baad)
  scanId:        mongoose.Types.ObjectId | null; // Linked Scan document
  status:        'pending' | 'processing' | 'done' | 'skipped';
  skipReason:    string;     // "Cloud cover too high" etc.
  isBaseline:    boolean;    // First scan = true
  ndvi:          number;
  forestPct:     number;
  // Comparison results
  deltaFromBaseline: number; // % change from Scan 1
  deltaFromPrevious: number; // % change from Scan N-1
  lossHectares:  number;     // Hectares lost from baseline
  alertSent:     boolean;    // Email alert already sent?
}

// ── Final report after campaign completes ────────────────────────────────────
interface ICampaignReport {
  totalLossPct:     number;  // % forest lost from baseline to last scan
  totalLossHa:      number;  // Hectares lost
  ratePerYear:      number;  // Ha per year annualized
  biggestDropPct:   number;  // Biggest single-scan drop
  biggestDropIndex: number;  // Which scan had biggest drop
  aiVerdict:        string;  // GPT-4o Vision overall verdict
  generatedAt:      Date;
}

// ── Main Campaign interface ──────────────────────────────────────────────────
export interface ICampaign extends Document {
  name:           string;
  zoneId:         mongoose.Types.ObjectId;
  bbox:           number[];   // [lng_min, lat_min, lng_max, lat_max]
  areaKm2:        number;     // Calculated from bbox

  // Time window
  startDate:      Date;
  endDate:        Date;
  scanDates:      Date[];     // Pre-calculated scheduled dates

  // Scan settings
  scanCount:      number;     // 2, 4, 6, 8, 10
  resolution:     number;     // 10, 20, 30 meters
  maxCloudCover:  number;     // 0-100%
  retryIfCloudy:  boolean;

  // Alerts
  alertEmail:     string;
  alertThreshold: number;     // % NDVI drop that triggers alert

  // Status
  status:         'active' | 'paused' | 'completed';
  scans:          ICampaignScan[];
  currentScanIdx: number;     // Which scan is next

  // Final report
  finalReport:    ICampaignReport | null;

  createdBy:      mongoose.Types.ObjectId;
  createdAt:      Date;
  updatedAt:      Date;
}

// ── Schema ───────────────────────────────────────────────────────────────────
const CampaignScanSchema = new Schema<ICampaignScan>({
  scheduledDate:     { type: Date,    required: true },
  actualDate:        { type: Date,    default: null },
  scanId:            { type: Schema.Types.ObjectId, ref: 'Scan', default: null },
  status:            { type: String,  enum: ['pending', 'processing', 'done', 'skipped'], default: 'pending' },
  skipReason:        { type: String,  default: '' },
  isBaseline:        { type: Boolean, default: false },
  ndvi:              { type: Number,  default: 0 },
  forestPct:         { type: Number,  default: 0 },
  deltaFromBaseline: { type: Number,  default: 0 },
  deltaFromPrevious: { type: Number,  default: 0 },
  lossHectares:      { type: Number,  default: 0 },
  alertSent:         { type: Boolean, default: false },
}, { _id: false });

const CampaignReportSchema = new Schema<ICampaignReport>({
  totalLossPct:     { type: Number, default: 0 },
  totalLossHa:      { type: Number, default: 0 },
  ratePerYear:      { type: Number, default: 0 },
  biggestDropPct:   { type: Number, default: 0 },
  biggestDropIndex: { type: Number, default: 0 },
  aiVerdict:        { type: String, default: '' },
  generatedAt:      { type: Date,   default: Date.now },
}, { _id: false });

const CampaignSchema = new Schema<ICampaign>({
  name:    { type: String, required: true, trim: true },
  zoneId:  { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
  bbox:    { type: [Number], required: true },
  areaKm2: { type: Number, default: 0 },

  startDate:  { type: Date, required: true },
  endDate:    { type: Date, required: true },
  scanDates:  { type: [Date], default: [] },

  scanCount:     { type: Number, default: 4, min: 2, max: 10 },
  resolution:    { type: Number, default: 20, enum: [10, 20, 30] },
  maxCloudCover: { type: Number, default: 50, min: 0, max: 100 },
  retryIfCloudy: { type: Boolean, default: true },

  alertEmail:     { type: String, default: '' },
  alertThreshold: { type: Number, default: 10, min: 1, max: 50 },

  status:         { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  scans:          { type: [CampaignScanSchema], default: [] },
  currentScanIdx: { type: Number, default: 0 },

  finalReport: { type: CampaignReportSchema, default: null },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model<ICampaign>('Campaign', CampaignSchema);
