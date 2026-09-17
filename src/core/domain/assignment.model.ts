import mongoose, { Document, Model, Schema } from 'mongoose';
import { AssessmentStatus, IAssignmentSafeDTO } from './domain-types';

export interface IAssignmentDocument extends Document {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  title: string;
  instructionsMarkdown: string;
  status: AssessmentStatus;
  passingScorePercent: number;
  maxScore: number;
  maxSubmissions: number; // 0 = unlimited
  allowedFileExtensions: string[];
  maxFileSizeBytes: number;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IAssignmentSafeDTO;
}

const AssignmentSchema = new Schema<IAssignmentDocument>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson ID is required']
    },
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true
    },
    instructionsMarkdown: {
      type: String,
      required: [true, 'Instructions markdown is required']
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    passingScorePercent: {
      type: Number,
      required: true,
      min: [1, 'Passing score must be at least 1%'],
      max: [100, 'Passing score cannot exceed 100%'],
      default: 70
    },
    maxScore: {
      type: Number,
      required: true,
      min: [1, 'Max score must be at least 1'],
      default: 100
    },
    maxSubmissions: {
      type: Number,
      required: true,
      min: [0, 'Max submissions cannot be negative'],
      default: 0 // 0 = unlimited
    },
    allowedFileExtensions: {
      type: [String],
      required: true,
      default: ['.pdf', '.zip']
    },
    maxFileSizeBytes: {
      type: Number,
      required: true,
      min: [1024, 'Max file size must be at least 1KB'],
      default: 52428800 // 50MB default
    },
    dueDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'assignments'
  }
);

// Indexes
AssignmentSchema.index({ lessonId: 1 }, { unique: true });
AssignmentSchema.index({ courseId: 1, status: 1 });

AssignmentSchema.methods.toSafeDTO = function (this: IAssignmentDocument): IAssignmentSafeDTO {
  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    lessonId: this.lessonId.toString(),
    title: this.title,
    instructionsMarkdown: this.instructionsMarkdown,
    status: this.status,
    passingScorePercent: this.passingScorePercent,
    maxScore: this.maxScore,
    maxSubmissions: this.maxSubmissions,
    allowedFileExtensions: this.allowedFileExtensions,
    maxFileSizeBytes: this.maxFileSizeBytes,
    dueDate: this.dueDate ? this.dueDate.toISOString() : null,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString()
  };
};

export const AssignmentModel: Model<IAssignmentDocument> =
  mongoose.models.Assignment || mongoose.model<IAssignmentDocument>('Assignment', AssignmentSchema);
