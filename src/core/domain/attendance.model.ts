import mongoose, { Document, Model, Schema } from 'mongoose';
import { AttendanceStatus, IAttendanceSafeDTO } from './domain-types';

export interface IAttendanceDocument extends Document {
  _id: mongoose.Types.ObjectId;
  liveSessionId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: AttendanceStatus;
  joinedAt: Date;
  lastSeenAt?: Date | null;
  joinCount: number;
  ipAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IAttendanceSafeDTO;
}

const AttendanceSchema = new Schema<IAttendanceDocument>(
  {
    liveSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'LiveSession',
      required: [true, 'Live session ID is required'],
      index: true
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch ID is required'],
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    status: {
      type: String,
      required: [true, 'Attendance status is required'],
      enum: {
        values: ['present', 'late', 'absent', 'excused'],
        message: '{VALUE} is not a valid attendance status'
      },
      default: 'present',
      index: true
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    joinCount: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Join count must be at least 1']
    },
    ipAddress: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'attendances'
  }
);

// Indexes
AttendanceSchema.index({ liveSessionId: 1, userId: 1 }, { unique: true });
AttendanceSchema.index({ batchId: 1, userId: 1 });
AttendanceSchema.index({ userId: 1, status: 1 });

AttendanceSchema.methods.toSafeDTO = function (this: IAttendanceDocument): IAttendanceSafeDTO {
  return {
    id: this._id.toString(),
    liveSessionId: this.liveSessionId.toString(),
    batchId: this.batchId.toString(),
    userId: this.userId.toString(),
    status: this.status,
    joinedAt: this.joinedAt.toISOString(),
    lastSeenAt: this.lastSeenAt ? this.lastSeenAt.toISOString() : null,
    joinCount: this.joinCount,
    ipAddress: this.ipAddress,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString()
  };
};

export const AttendanceModel: Model<IAttendanceDocument> =
  mongoose.models.Attendance || mongoose.model<IAttendanceDocument>('Attendance', AttendanceSchema);
