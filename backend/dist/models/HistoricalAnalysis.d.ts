/**
 * HistoricalAnalysis Model
 * ------------------------
 * Saves completed historical analysis results to MongoDB.
 * Includes per-scan data, NDVI metrics, image paths (served via ML static server),
 * summary statistics, and AI verdict.
 */
import mongoose, { Document } from 'mongoose';
export interface IHistoricalScan {
    date: string;
    status: 'done' | 'skipped';
    skip_reason: string;
    ndvi_mean: number;
    forest_pct: number;
    vegetation_pct: number;
    water_pct: number;
    bare_soil_pct: number;
    cloud_pct: number;
    threats: string[];
    severity: string;
    description: string;
    image_url: string;
    heatmap_url: string;
    delta_from_first: number;
    loss_hectares: number;
}
export interface IHistoricalSummary {
    total_loss_pct: number;
    total_loss_ha: number;
    rate_per_year: number;
    biggest_drop_pct: number;
    biggest_drop_date: string;
    scans_done: number;
    scans_skipped: number;
}
export interface IHistoricalAnalysis extends Document {
    zoneId: mongoose.Types.ObjectId;
    zoneName: string;
    bbox: number[];
    dates: string[];
    resolution: number;
    scans: IHistoricalScan[];
    summary: IHistoricalSummary;
    ai_verdict: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}
declare const _default: mongoose.Model<IHistoricalAnalysis, {}, {}, {}, mongoose.Document<unknown, {}, IHistoricalAnalysis, {}, {}> & IHistoricalAnalysis & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=HistoricalAnalysis.d.ts.map