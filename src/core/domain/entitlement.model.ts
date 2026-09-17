import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  EntitlementStatus,
  EntitlementTargetType,
  MarketCode,
  IEntitlementSafeDTO
} from './domain-types';

export interface IEntitlementDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceOrderId?: mongoose.Types.ObjectId | null;
  marketCode: MarketCode;
  targetType: EntitlementTargetType;
  targetId: mongoose.Types.ObjectId;
  status: EntitlementStatus;
  grantedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isAccessValid(atDate?: Date): boolean;
  toSafeDTO(): IEntitlementSafeDTO;
}

const EntitlementSchema = new Schema<IEntitlementDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    sourceOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    marketCode: {
      type: String,
      required: [true, 'Market code is required'],
      enum: {
        values: ['SG', 'MY'],
        message: '{VALUE} is not a supported market code.'
      }
    },
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      enum: {
        values: ['course', 'batch', 'workshop', 'bundle', 'membership', 'consultation'],
        message: '{VALUE} is not a valid entitlement target type.'
      }
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      index: true
    },
    status: {
      type: String,
      required: [true, 'Entitlement status is required'],
      enum: {
        values: ['active', 'suspended', 'revoked', 'expired'],
        message: '{VALUE} is not a valid entitlement status.'
      },
      default: 'active',
      index: true
    },
    grantedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null // Null indicates lifetime access
    }
  },
  {
    timestamps: true,
    collection: 'entitlements'
  }
);

// Compound Unique-Active Index per DATABASE_SCHEMA.md:
// Guarantees only ONE active entitlement per (userId, targetType, targetId)
// while allowing multiple historical revoked/expired records for auditability.
EntitlementSchema.index(
  { userId: 1, targetType: 1, targetId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);
EntitlementSchema.index({ userId: 1, status: 1 });


EntitlementSchema.methods.isAccessValid = function (this: IEntitlementDocument, atDate?: Date): boolean {
  if (this.status !== 'active') {
    return false;
  }
  const checkTime = atDate ? atDate.getTime() : Date.now();
  if (this.expiresAt && checkTime >= this.expiresAt.getTime()) {
    return false;
  }
  return true;
};

EntitlementSchema.methods.toSafeDTO = function (this: IEntitlementDocument): IEntitlementSafeDTO {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    sourceOrderId: this.sourceOrderId ? this.sourceOrderId.toString() : null,
    marketCode: this.marketCode,
    targetType: this.targetType,
    targetId: this.targetId.toString(),
    status: this.status,
    grantedAt: this.grantedAt.toISOString(),
    expiresAt: this.expiresAt ? this.expiresAt.toISOString() : null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const EntitlementModel: Model<IEntitlementDocument> =
  mongoose.models.Entitlement || mongoose.model<IEntitlementDocument>('Entitlement', EntitlementSchema);
