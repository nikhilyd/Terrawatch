import mongoose, { Document } from 'mongoose';
interface IScanResults {
    forestPercentage: number;
    vegetationPercentage: number;
    bareSoilPercentage: number;
    waterPercentage: number;
    ndviMean: number;
    ndviMin: number;
    ndviMax: number;
    threats: string[];
    severity: string;
    description: string;
    affectedAreas: string[];
    forestVisible: boolean;
    vlConfidence: string;
    deforestationDetected: boolean;
    heatmapPath: string;
}
export interface IScan extends Document {
    zoneId: mongoose.Types.ObjectId;
    jobId: string;
    scanDate: Date;
    imagePath: string;
    results: IScanResults;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    failedAt: Date | null;
    failReason: string;
    createdAt: Date;
}
declare const _default: mongoose.Model<IScan, {}, {}, {}, mongoose.Document<unknown, {}, IScan, {}, {}> & IScan & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Scan.d.ts.map