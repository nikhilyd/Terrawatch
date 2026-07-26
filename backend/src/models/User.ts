import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'analyst' | 'viewer' | 'field';

export interface IUser extends Document {
  name:        string;
  email:       string;
  password:    string;
  role:        UserRole;
  alertEmail:  string;
  // Notification preferences
  notifyOn: {
    critical: boolean;
    high:     boolean;
    medium:   boolean;
    low:      boolean;
    digest:   boolean;  // Weekly digest
  };
  createdAt: Date;
  matchPassword(entered: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true, minlength: 6, select: false },
  role: {
    type:    String,
    enum:    ['admin', 'analyst', 'viewer', 'field'],
    default: 'analyst',
  },
  alertEmail: { type: String, default: '' },
  notifyOn: {
    critical: { type: Boolean, default: true  },
    high:     { type: Boolean, default: true  },
    medium:   { type: Boolean, default: false },
    low:      { type: Boolean, default: false },
    digest:   { type: Boolean, default: true  },
  },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt    = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (entered: string): Promise<boolean> {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
