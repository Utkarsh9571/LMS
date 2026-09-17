import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  BatchStatus,
  MarketCode,
  LiveMeetingProviderType,
  IBatchSafeDTO
} from './domain-types';

export interface IBatchDocument extends Document {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  marketCode: MarketCode;
  code: string;
  name: string;
  description?: string;
  status: BatchStatus;
  capacity: number;
  enrolledCount: number;
  startDate: Date;
  endDate: Date;
  enrollmentOpenAt?: Date | null;
  enrollmentCloseAt?: Date | null;
  primaryInstructorId: mongoose.Types.ObjectId;
  meetingProvider: LiveMeetingProviderType;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IBatchSafeDTO;
}

const BatchSchema = new Schema<IBatchDocument>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    marketCode: {
      type: String,
      required: [true, 'Market code is required'],
      enum: {
        values: ['SG', 'MY'],
        message: '{VALUE} is not a valid market code'
      },
      index: true
    },
    code: {
      type: String,
      required: [true, 'Batch code is required'],
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      required: [true, 'Batch status is required'],
      enum: {
        values: ['draft', 'upcoming', 'enrolling', 'in_progress', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid batch status'
      },
      default: 'draft'
    },
    capacity: {
      type: Number,
      required: [true, 'Batch capacity is required'],
      min: [1, 'Batch capacity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Batch capacity must be an integer'
      }
    },
    enrolledCount: {
      type: Number,
      required: true,
      min: [0, 'Enrolled count cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Enrolled count must be an integer'
      }
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    enrollmentOpenAt: {
      type: Date,
      default: null
    },
    enrollmentCloseAt: {
      type: Date,
      default: null
    },
    primaryInstructorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Primary instructor ID is required'],
      index: true
    },
    meetingProvider: {
      type: String,
      required: true,
      enum: {
        values: ['mock', 'zoom', 'google_meet'],
        message: '{VALUE} is not a valid meeting provider'
      },
      default: 'mock'
    }
  },
  {
    timestamps: true,
    collection: 'batches'
  }
);

// Indexes
BatchSchema.index({ code: 1 }, { unique: true });
BatchSchema.index({ courseId: 1, status: 1 });
BatchSchema.index({ marketCode: 1, status: 1 });
BatchSchema.index({ primaryInstructorId: 1, status: 1 });
BatchSchema.index({ status: 1, enrollmentOpenAt: 1, enrollmentCloseAt: 1 });

BatchSchema.methods.toSafeDTO = function (this: IBatchDocument): IBatchSafeDTO {
  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    marketCode: this.marketCode,
    code: this.code,
    name: this.name,
    description: this.description,
    status: this.status,
    capacity: this.capacity,
    enrolledCount: this.enrolledCount,
    startDate: this.startDate.toISOString(),
    endDate: this.endDate.toISOString(),
    enrollmentOpenAt: this.enrollmentOpenAt ? this.enrollmentOpenAt.toISOString() : null,
    enrollmentCloseAt: this.enrollmentCloseAt ? this.enrollmentCloseAt.toISOString() : null,
    primaryInstructorId: this.primaryInstructorId.toString(),
    meetingProvider: this.meetingProvider,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString()
  };
};

export const BatchModel: Model<IBatchDocument> =
  mongoose.models.Batch || mongoose.model<IBatchDocument>('Batch', BatchSchema);
