import mongoose, { Document, Schema } from 'mongoose';

export interface IZone extends Document {
  name:           string;
  description:    string;
  // Center point (display ke liye)
  coordinates: {
    lat: number;
    lng: number;
  };
  // Bounding box — Sentinel Hub ke liye zarori!
  bbox: {
    lng_min: number;  // West
    lat_min: number;  // South
    lng_max: number;  // East
    lat_max: number;  // North
  };
  sentinelConfig: {
    resolution:    number;   // meters/pixel (10 = Sentinel-2 default)
    cloudCoverage: number;   // max cloud coverage % (0-100)
  };
  area_km2:       number;
  alertThreshold: number;
  isActive:       boolean;
  lastScanned:    Date | null;
  createdBy:      mongoose.Types.ObjectId;
  createdAt:      Date;
}

const ZoneSchema = new Schema<IZone>({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  // Sentinel Hub ke liye bbox
  bbox: {
    lng_min: { type: Number, required: true },
    lat_min: { type: Number, required: true },
    lng_max: { type: Number, required: true },
    lat_max: { type: Number, required: true },
  },
  sentinelConfig: {
    resolution:    { type: Number, default: 10  },
    cloudCoverage: { type: Number, default: 30  },
  },
  area_km2:       { type: Number,  default: 0    },
  alertThreshold: { type: Number,  default: 10   },
  isActive:       { type: Boolean, default: true },
  lastScanned:    { type: Date,    default: null },
  createdBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model<IZone>('Zone', ZoneSchema);
