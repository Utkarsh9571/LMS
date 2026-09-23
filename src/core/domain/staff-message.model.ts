import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  StaffMessageAction,
  StaffMessageStatus,
  StaffMessageTargetType,
  MarketCode,
  IStaffMessageSafeDTO
} from './domain-types';

export interface IStaffMessageDocument extends Document {
  _id: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  action: StaffMessageAction;
  targetType: StaffMessageTargetType;
  targetId: mongoose.Types.ObjectId;
  targetName: string;
  subject: string;
  messagePreview: string;
  recipientCount: number;
  failedCount: number;
  status: StaffMessageStatus;
  failureReason?: string | null;
  idempotencyKey?: string | null;
  marketCode?: MarketCode | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IStaffMessageSafeDTO;
}

const StaffMessageSchema = new Schema<IStaffMessageDocument>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true
    },
    senderName: {
      type: String,
      required: [true, 'Sender name is required'],
      trim: true
    },
    action: {
      type: String,
      required: [true, 'Message action is required'],
      enum: {
        values: ['workshop_reminder', 'batch_announcement', 'individual_email'],
        message: '{VALUE} is not a valid message action'
      },
      index: true
    },
    targetType: {
      type: String,
      required: [true, 'Target type is required'],
      enum: {
        values: ['batch', 'session', 'user'],
        message: '{VALUE} is not a valid target type'
      }
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      index: true
    },
    targetName: {
      type: String,
      required: [true, 'Target name is required'],
      trim: true
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject must not exceed 200 characters']
    },
    messagePreview: {
      type: String,
      required: true,
      trim: true
    },
    recipientCount: {
      type: Number,
      required: true,
      min: [0, 'Recipient count cannot be negative'],
      default: 0
    },
    failedCount: {
      type: Number,
      required: true,
      min: [0, 'Failed count cannot be negative'],
      default: 0
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['submitted', 'failed', 'partially_failed'],
        message: '{VALUE} is not a valid staff message status'
      },
      default: 'submitted',
      index: true
    },
    failureReason: {
      type: String,
      default: null,
      trim: true
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null
    },
    marketCode: {
      type: String,
      enum: ['SG', 'MY'],
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'staff_messages'
  }
);

// Database-enforced race safety for idempotent dispatches
StaffMessageSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true }
);

StaffMessageSchema.index({ senderId: 1, createdAt: -1 });
StaffMessageSchema.index({ targetId: 1, createdAt: -1 });
StaffMessageSchema.index({ createdAt: -1 });

StaffMessageSchema.methods.toSafeDTO = function (this: IStaffMessageDocument): IStaffMessageSafeDTO {
  return {
    id: this._id.toString(),
    senderId: this.senderId.toString(),
    senderName: this.senderName,
    action: this.action,
    targetType: this.targetType,
    targetId: this.targetId.toString(),
    targetName: this.targetName,
    subject: this.subject,
    messagePreview: this.messagePreview,
    recipientCount: this.recipientCount,
    failedCount: this.failedCount,
    status: this.status,
    failureReason: this.failureReason || null,
    marketCode: this.marketCode || null,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString()
  };
};

export const StaffMessageModel: Model<IStaffMessageDocument> =
  mongoose.models.StaffMessage ||
  mongoose.model<IStaffMessageDocument>('StaffMessage', StaffMessageSchema);
