import mongoose, { Document, Model, Schema } from 'mongoose';
import { UserRole, UserStatus, MarketCode, IUserSafeProfile } from './domain-types';

export interface IUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  globalRoles: UserRole[];
  status: UserStatus;
  lastActiveMarket?: MarketCode;
  createdAt: Date;
  updatedAt: Date;
  toSafeProfile(): IUserSafeProfile;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never selected by default in queries
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    avatarUrl: {
      type: String,
      trim: true
    },
    globalRoles: {
      type: [String],
      enum: ['superadmin', 'admin', 'staff', 'instructor', 'student'],
      default: ['student'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      required: true,
      index: true
    },
    lastActiveMarket: {
      type: String,
      enum: ['SG', 'MY']
    }
  },
  {
    timestamps: true,
    collection: 'users'
  }
);

// Method to return safe public identity without passwordHash
UserSchema.methods.toSafeProfile = function (this: IUserDocument): IUserSafeProfile {
  return {
    id: this._id.toString(),
    email: this.email,
    fullName: this.fullName,
    phone: this.phone,
    avatarUrl: this.avatarUrl,
    globalRoles: this.globalRoles,
    status: this.status,
    lastActiveMarket: this.lastActiveMarket,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
