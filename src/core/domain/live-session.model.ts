import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  LiveSessionStatus,
  LiveMeetingProviderType,
  RecordingStatus,
  ILiveSessionSafeDTO
} from './domain-types';

export interface ILiveSessionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: LiveSessionStatus;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  meetingProvider: LiveMeetingProviderType;
  providerMeetingId: string;
  hostUrl?: string;
  studentJoinUrl: string;
  recordingStatus: RecordingStatus;
  recordingUrl?: string | null;
  recordingDurationSeconds?: number | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(includeHostUrl?: boolean): ILiveSessionSafeDTO;
}

const LiveSessionSchema = new Schema<ILiveSessionDocument>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch ID is required'],
      index: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Live session title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      required: [true, 'Session status is required'],
      enum: {
        values: ['scheduled', 'live', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid session status'
      },
      default: 'scheduled'
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required']
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      validate: {
        validator: Number.isInteger,
        message: 'Duration must be an integer'
      }
    },
    meetingProvider: {
      type: String,
      required: true,
      enum: {
        values: ['mock', 'zoom', 'google_meet'],
        message: '{VALUE} is not a valid meeting provider'
      },
      default: 'mock'
    },
    providerMeetingId: {
      type: String,
      required: [true, 'Provider meeting ID is required'],
      trim: true
    },
    hostUrl: {
      type: String,
      trim: true
    },
    studentJoinUrl: {
      type: String,
      required: [true, 'Student join URL is required'],
      trim: true
    },
    recordingStatus: {
      type: String,
      required: true,
      enum: {
        values: ['none', 'processing', 'available', 'failed'],
        message: '{VALUE} is not a valid recording status'
      },
      default: 'none'
    },
    recordingUrl: {
      type: String,
      default: null,
      trim: true
    },
    recordingDurationSeconds: {
      type: Number,
      default: null,
      min: [0, 'Recording duration cannot be negative']
    }
  },
  {
    timestamps: true,
    collection: 'live_sessions'
  }
);

// Indexes
LiveSessionSchema.index({ batchId: 1, startTime: 1 });
LiveSessionSchema.index({ courseId: 1, startTime: 1 });
LiveSessionSchema.index({ status: 1 });

LiveSessionSchema.methods.toSafeDTO = function (
  this: ILiveSessionDocument,
  includeHostUrl: boolean = false
): ILiveSessionSafeDTO {
  return {
    id: this._id.toString(),
    batchId: this.batchId.toString(),
    courseId: this.courseId.toString(),
    title: this.title,
    description: this.description,
    status: this.status,
    startTime: this.startTime.toISOString(),
    endTime: this.endTime.toISOString(),
    durationMinutes: this.durationMinutes,
    meetingProvider: this.meetingProvider,
    providerMeetingId: this.providerMeetingId,
    hostUrl: includeHostUrl ? this.hostUrl : undefined,
    studentJoinUrl: this.studentJoinUrl,
    recordingStatus: this.recordingStatus,
    recordingUrl: this.recordingUrl,
    recordingDurationSeconds: this.recordingDurationSeconds,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString()
  };
};

export const LiveSessionModel: Model<ILiveSessionDocument> =
  mongoose.models.LiveSession || mongoose.model<ILiveSessionDocument>('LiveSession', LiveSessionSchema);
