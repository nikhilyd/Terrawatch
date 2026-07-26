import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
  zoneId:           mongoose.Types.ObjectId;
  scanId:           mongoose.Types.ObjectId | null;   // optional — field reports have no scanId
  prevScanId:       mongoose.Types.ObjectId | null;
  source:           'satellite' | 'field_report';     // alert ka origin
  fieldReportId:    mongoose.Types.ObjectId | null;   // set when source = 'field_report'
  forestLoss:       number;
  bareSoilIncrease: number;
  waterLoss:        number;
  severity:         'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status:           'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_ALARM';
  message:    string;
  isRead:     boolean;
  emailSent:  boolean;
  createdAt:  Date;
  resolutionNote?:  string;
  resolvedBy?:      mongoose.Types.ObjectId;
  resolvedAt?:      Date;

  // GPT-4o Vision comparison fields
  changeType:           string;
  probableCause:        string;
  changedAreas:         string[];
  changeDescription:    string;
  comparisonImagePath:  string;
  hotspot:              { lat: number; lng: number } | null;
}

const AlertSchema = new Schema<IAlert>({
  zoneId:           { type: Schema.Types.ObjectId, ref: 'Zone',        required: true },
  scanId:           { type: Schema.Types.ObjectId, ref: 'Scan',        required: false, default: null },
  prevScanId:       { type: Schema.Types.ObjectId, ref: 'Scan',        default: null },
  source:           { type: String, enum: ['satellite', 'field_report'], default: 'satellite' },
  fieldReportId:    { type: Schema.Types.ObjectId, ref: 'FieldReport', default: null },
  forestLoss:       { type: Number, default: 0 },
  bareSoilIncrease: { type: Number, default: 0 },
  waterLoss:        { type: Number, default: 0 },
  severity: {
    type:    String,
    enum:    ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  status: {
    type:    String,
    enum:    ['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_ALARM'],
    default: 'OPEN',
  },
  message:   { type: String, required: true },
  isRead:    { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },

  // Ticketing / Case Management
  resolutionNote: { type: String, default: '' },
  resolvedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:     { type: Date },

  // GPT-4o deep comparison — alert create hone ke baad update hota hai
  changeType:           { type: String, default: '' },
  probableCause:        { type: String, default: '' },
  changedAreas:         { type: [String], default: [] },
  changeDescription:    { type: String, default: '' },
  comparisonImagePath:  { type: String, default: '' },

  hotspot: {
    lat: { type: Number },
    lng: { type: Number },
  },
}, { timestamps: true });

export default mongoose.model<IAlert>('Alert', AlertSchema);
