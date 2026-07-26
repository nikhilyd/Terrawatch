import mongoose, { Document } from 'mongoose';
export interface IZone extends Document {
    name: string;
    description: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    bbox: {
        lng_min: number;
        lat_min: number;
        lng_max: number;
        lat_max: number;
    };
    sentinelConfig: {
        resolution: number;
        cloudCoverage: number;
    };
    area_km2: number;
    alertThreshold: number;
    isActive: boolean;
    lastScanned: Date | null;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}
declare const _default: mongoose.Model<IZone, {}, {}, {}, mongoose.Document<unknown, {}, IZone, {}, {}> & IZone & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Zone.d.ts.map