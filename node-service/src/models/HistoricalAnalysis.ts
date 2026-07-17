/**
 * HistoricalAnalysis Model
 * ------------------------
 * Saves completed historical analysis results to MongoDB.
 * Includes per-scan data, NDVI metrics, image paths (served via ML static server),
 * summary statistics, and AI verdict.
 */

import mongoose, { Document, Schema } from 'mongoose';

// ── Per-scan entry ────────────────────────────────────────────────────────────
export interface IHistoricalScan {
  date:             string;
  status:           'done' | 'skipped';
  skip_reason:      string;
  ndvi_mean:        number;
  forest_pct:       number;
  vegetation_pct:   number;
  water_pct:        number;
  bare_soil_pct:    number;
  cloud_pct:        number;   // % pixels excluded by SCL cloud masking
  threats:          string[];
  severity:         string;
  description:      string;
  image_url:        string;
  heatmap_url:      string;
  delta_from_first: number;
  loss_hectares:    number;
}

// ── Summary ───────────────────────────────────────────────────────────────────
export interface IHistoricalSummary {
  total_loss_pct:    number;
  total_loss_ha:     number;
  rate_per_year:     number;
  biggest_drop_pct:  number;
  biggest_drop_date: string;
  scans_done:        number;
  scans_skipped:     number;
}

// ── Document interface ────────────────────────────────────────────────────────
export interface IHistoricalAnalysis extends Document {
  zoneId:     mongoose.Types.ObjectId;
  zoneName:   string;
  bbox:       number[];
  dates:      string[];
  resolution: number;
  scans:      IHistoricalScan[];
  summary:    IHistoricalSummary;
  ai_verdict: string;
  createdBy:  mongoose.Types.ObjectId;
  createdAt:  Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────
const HistoricalScanSchema = new Schema<IHistoricalScan>({
  date:             { type: String, required: true },
  status:           { type: String, enum: ['done', 'skipped'], default: 'done' },
  skip_reason:      { type: String, default: '' },
  ndvi_mean:        { type: Number, default: 0 },
  forest_pct:       { type: Number, default: 0 },
  vegetation_pct:   { type: Number, default: 0 },
  water_pct:        { type: Number, default: 0 },
  bare_soil_pct:    { type: Number, default: 0 },
  cloud_pct:        { type: Number, default: 0 },
  threats:          [{ type: String }],
  severity:         { type: String, default: 'none' },
  description:      { type: String, default: '' },
  image_url:        { type: String, default: '' },
  heatmap_url:      { type: String, default: '' },
  delta_from_first: { type: Number, default: 0 },
  loss_hectares:    { type: Number, default: 0 },
}, { _id: false });

const HistoricalSummarySchema = new Schema<IHistoricalSummary>({
  total_loss_pct:    { type: Number, default: 0 },
  total_loss_ha:     { type: Number, default: 0 },
  rate_per_year:     { type: Number, default: 0 },
  biggest_drop_pct:  { type: Number, default: 0 },
  biggest_drop_date: { type: String, default: '' },
  scans_done:        { type: Number, default: 0 },
  scans_skipped:     { type: Number, default: 0 },
}, { _id: false });

const HistoricalAnalysisSchema = new Schema<IHistoricalAnalysis>({
  zoneId:     { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
  zoneName:   { type: String, required: true },
  bbox:       [{ type: Number }],
  dates:      [{ type: String }],
  resolution: { type: Number, default: 20 },
  scans:      [HistoricalScanSchema],
  summary:    { type: HistoricalSummarySchema, default: () => ({}) },
  ai_verdict: { type: String, default: '' },
  createdBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Index for fast user-specific queries
HistoricalAnalysisSchema.index({ createdBy: 1, createdAt: -1 });
HistoricalAnalysisSchema.index({ zoneId: 1 });

export default mongoose.model<IHistoricalAnalysis>('HistoricalAnalysis', HistoricalAnalysisSchema);
