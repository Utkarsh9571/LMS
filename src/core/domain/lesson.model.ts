import mongoose, { Document, Model, Schema } from 'mongoose';
import { LessonContentType, ILessonContentData, ILessonResource, ILessonSafeDTO } from './domain-types';

export interface ILessonDocument extends Document {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  title: string;
  order: number;
  contentType: LessonContentType;
  contentData: ILessonContentData;
  isPreviewFree: boolean;
  unlockOverrideDays: number | null;
  resources: ILessonResource[];
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): ILessonSafeDTO;
}

const LessonResourceSchema = new Schema<ILessonResource>(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key reference is required'],
      trim: true
    },
    fileSizeBytes: {
      type: Number,
      required: [true, 'File size in bytes is required'],
      min: [0, 'File size cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} must be an integer.'
      }
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true
    },
    downloadAllowed: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const LessonContentDataSchema = new Schema<ILessonContentData>(
  {
    videoStorageKey: { type: String, trim: true },
    durationSeconds: { type: Number, min: 0 },
    pdfStorageKey: { type: String, trim: true },
    bodyMarkdown: { type: String },
    quizId: { type: Schema.Types.ObjectId },
    assignmentId: { type: Schema.Types.ObjectId }
  },
  { _id: false }
);

const LessonSchema = new Schema<ILessonDocument>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true
    },
    order: {
      type: Number,
      required: [true, 'Lesson order is required'],
      min: [0, 'Order cannot be negative'],
      default: 0
    },
    contentType: {
      type: String,
      required: [true, 'Content type is required'],
      enum: {
        values: ['video', 'pdf', 'rich_text', 'quiz', 'assignment'],
        message: '{VALUE} is not a valid lesson content type.'
      }
    },
    contentData: {
      type: LessonContentDataSchema,
      default: () => ({})
    },
    isPreviewFree: {
      type: Boolean,
      default: false
    },
    unlockOverrideDays: {
      type: Number,
      default: null,
      validate: {
        validator: (v: number | null) => v === null || (Number.isInteger(v) && v >= 0),
        message: '{VALUE} must be null or a non-negative integer number of days.'
      }
    },
    resources: {
      type: [LessonResourceSchema],
      default: []
    }
  },
  {
    timestamps: true,
    collection: 'lessons'
  }
);

// Compound indexes for hierarchy and ordering queries
LessonSchema.index({ moduleId: 1, order: 1 });
LessonSchema.index({ courseId: 1, moduleId: 1 });

LessonSchema.methods.toSafeDTO = function (this: ILessonDocument): ILessonSafeDTO {
  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    moduleId: this.moduleId.toString(),
    title: this.title,
    order: this.order,
    contentType: this.contentType,
    contentData: this.contentData || {},
    isPreviewFree: this.isPreviewFree,
    unlockOverrideDays: this.unlockOverrideDays,
    resources: (this.resources || []).map(r => ({
      title: r.title,
      storageKey: r.storageKey,
      fileSizeBytes: r.fileSizeBytes,
      mimeType: r.mimeType,
      downloadAllowed: r.downloadAllowed
    })),
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const LessonModel: Model<ILessonDocument> =
  mongoose.models.Lesson || mongoose.model<ILessonDocument>('Lesson', LessonSchema);
