import mongoose, { Document } from 'mongoose';
export type UserRole = 'admin' | 'analyst' | 'viewer' | 'field';
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    alertEmail: string;
    notifyOn: {
        critical: boolean;
        high: boolean;
        medium: boolean;
        low: boolean;
        digest: boolean;
    };
    createdAt: Date;
    matchPassword(entered: string): Promise<boolean>;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map