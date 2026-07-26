import mongoose, { Document, Schema } from 'mongoose';

export interface IFieldReport extends Document {
  zoneId:       mongoose.Types.ObjectId;
  reportedBy:   mongoose.Types.ObjectId;
  reporterName: string;
  imagePath:    string;
  gps:          { lat: number; lng: number };
  notes:        string;
  status:       'pending' | 'analyzed';
  aiAnalysis?: {
    threats:     string[];
    severity:    string;
    description: string;
    confidence:  string;
  };
  createdAt: Date;
}

const FieldReportSchema = new Schema<IFieldReport>({
  zoneId:       { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
  reportedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  reporterName: { type: String, default: 'Field Officer' },
  imagePath:    { type: String, required: true },
  gps: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  notes:   { type: String, default: '' },
  status:  { type: String, enum: ['pending', 'analyzed'], default: 'pending' },
  aiAnalysis: {
    threats:     { type: [String], default: [] },
    severity:    { type: String, default: 'none' },
    description: { type: String, default: '' },
    confidence:  { type: String, default: 'low' },
  },
}, { timestamps: true });

export default mongoose.model<IFieldReport>('FieldReport', FieldReportSchema);
