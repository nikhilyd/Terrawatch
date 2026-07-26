import mongoose, { Document } from 'mongoose';
export interface IFieldReport extends Document {
    zoneId: mongoose.Types.ObjectId;
    reportedBy: mongoose.Types.ObjectId;
    reporterName: string;
    imagePath: string;
    gps: {
        lat: number;
        lng: number;
    };
    notes: string;
    status: 'pending' | 'analyzed';
    aiAnalysis?: {
        threats: string[];
        severity: string;
        description: string;
        confidence: string;
    };
    createdAt: Date;
}
declare const _default: mongoose.Model<IFieldReport, {}, {}, {}, mongoose.Document<unknown, {}, IFieldReport, {}, {}> & IFieldReport & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=FieldReport.d.ts.map