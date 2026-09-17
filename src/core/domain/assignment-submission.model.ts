import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  AssignmentSubmissionStatus,
  IAssignmentSubmissionSafeDTO
} from './domain-types';

export interface IAssignmentSubmissionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  submissionNumber: number;
  status: AssignmentSubmissionStatus;
  storageKey: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  studentNotes?: string;
  submittedAt: Date;
  graderId?: mongoose.Types.ObjectId | null;
  gradedAt?: Date | null;
  score?: number | null;
  percentageScore?: number | null;
  isPassed?: boolean | null;
  feedbackMarkdown?: string | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(fileDownloadUrl?: string | null): IAssignmentSubmissionSafeDTO;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmissionDocument>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment ID is required'],
      index: true
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson ID is required'],
      index: true
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment ID is required'],
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    submissionNumber: {
      type: Number,
      required: [true, 'Submission number is required'],
      min: [1, 'Submission number must be at least 1']
    },
    status: {
      type: String,
      required: true,
      enum: ['submitted', 'graded', 'resubmission_requested'],
      default: 'submitted',
      index: true
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      trim: true
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true
    },
    fileSizeBytes: {
      type: Number,
      required: [true, 'File size in bytes is required'],
      min: [1, 'File size must be positive']
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true
    },
    studentNotes: {
      type: String,
      trim: true
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    graderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    gradedAt: {
      type: Date,
      default: null
    },
    score: {
      type: Number,
      default: null
    },
    percentageScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    isPassed: {
      type: Boolean,
      default: null,
      index: true
    },
    feedbackMarkdown: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'assignment_submissions'
  }
);

// Indexes
AssignmentSubmissionSchema.index(
  { enrollmentId: 1, assignmentId: 1, submissionNumber: 1 },
  { unique: true }
);
AssignmentSubmissionSchema.index({ enrollmentId: 1, assignmentId: 1, isPassed: 1 });
AssignmentSubmissionSchema.index({ assignmentId: 1, status: 1 });
AssignmentSubmissionSchema.index({ userId: 1, lessonId: 1 });

AssignmentSubmissionSchema.methods.toSafeDTO = function (
  this: IAssignmentSubmissionDocument,
  fileDownloadUrl: string | null = null
): IAssignmentSubmissionSafeDTO {
  return {
    id: this._id.toString(),
    assignmentId: this.assignmentId.toString(),
    lessonId: this.lessonId.toString(),
    enrollmentId: this.enrollmentId.toString(),
    userId: this.userId.toString(),
    submissionNumber: this.submissionNumber,
    status: this.status,
    // storageKey intentionally omitted — internal server reference only
    originalFileName: this.originalFileName,
    fileSizeBytes: this.fileSizeBytes,
    mimeType: this.mimeType,
    studentNotes: this.studentNotes,
    submittedAt: this.submittedAt.toISOString(),
    graderId: this.graderId ? this.graderId.toString() : null,
    gradedAt: this.gradedAt ? this.gradedAt.toISOString() : null,
    score: this.score ?? null,
    percentageScore: this.percentageScore ?? null,
    isPassed: this.isPassed ?? null,
    feedbackMarkdown: this.feedbackMarkdown ?? null,
    fileDownloadUrl: fileDownloadUrl ?? null,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString()
  };
};

export const AssignmentSubmissionModel: Model<IAssignmentSubmissionDocument> =
  mongoose.models.AssignmentSubmission ||
  mongoose.model<IAssignmentSubmissionDocument>(
    'AssignmentSubmission',
    AssignmentSubmissionSchema
  );
