import mongoose, { Document } from 'mongoose';
export interface IAlert extends Document {
    zoneId: mongoose.Types.ObjectId;
    scanId: mongoose.Types.ObjectId | null;
    prevScanId: mongoose.Types.ObjectId | null;
    source: 'satellite' | 'field_report';
    fieldReportId: mongoose.Types.ObjectId | null;
    forestLoss: number;
    bareSoilIncrease: number;
    waterLoss: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_ALARM';
    message: string;
    isRead: boolean;
    emailSent: boolean;
    createdAt: Date;
    resolutionNote?: string;
    resolvedBy?: mongoose.Types.ObjectId;
    resolvedAt?: Date;
    changeType: string;
    probableCause: string;
    changedAreas: string[];
    changeDescription: string;
    comparisonImagePath: string;
    hotspot: {
        lat: number;
        lng: number;
    } | null;
}
declare const _default: mongoose.Model<IAlert, {}, {}, {}, mongoose.Document<unknown, {}, IAlert, {}, {}> & IAlert & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Alert.d.ts.map