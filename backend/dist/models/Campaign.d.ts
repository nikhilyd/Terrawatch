import mongoose, { Document } from 'mongoose';
interface ICampaignScan {
    scheduledDate: Date;
    actualDate: Date | null;
    scanId: mongoose.Types.ObjectId | null;
    status: 'pending' | 'processing' | 'done' | 'skipped';
    skipReason: string;
    isBaseline: boolean;
    ndvi: number;
    forestPct: number;
    deltaFromBaseline: number;
    deltaFromPrevious: number;
    lossHectares: number;
    alertSent: boolean;
}
interface ICampaignReport {
    totalLossPct: number;
    totalLossHa: number;
    ratePerYear: number;
    biggestDropPct: number;
    biggestDropIndex: number;
    aiVerdict: string;
    generatedAt: Date;
}
export interface ICampaign extends Document {
    name: string;
    zoneId: mongoose.Types.ObjectId;
    bbox: number[];
    areaKm2: number;
    startDate: Date;
    endDate: Date;
    scanDates: Date[];
    scanCount: number;
    resolution: number;
    maxCloudCover: number;
    retryIfCloudy: boolean;
    alertEmail: string;
    alertThreshold: number;
    status: 'active' | 'paused' | 'completed';
    scans: ICampaignScan[];
    currentScanIdx: number;
    finalReport: ICampaignReport | null;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ICampaign, {}, {}, {}, mongoose.Document<unknown, {}, ICampaign, {}, {}> & ICampaign & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Campaign.d.ts.map