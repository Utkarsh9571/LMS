import mongoose, { Document, Model, Schema } from 'mongoose';
import { LessonProgressStatus, ILessonProgressSafeDTO } from './domain-types';

export interface ILessonProgressDocument extends Document {
  _id: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  status: LessonProgressStatus;
  secondsWatched: number;
  isCompleted: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): ILessonProgressSafeDTO;
}

const LessonProgressSchema = new Schema<ILessonProgressDocument>(
  {
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
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson ID is required'],
      index: true
    },
    status: {
      type: String,
      required: [true, 'Progress status is required'],
      enum: {
        values: ['not_started', 'in_progress', 'completed'],
        message: '{VALUE} is not a valid progress status.'
      },
      default: 'not_started'
    },
    secondsWatched: {
      type: Number,
      required: true,
      min: [0, 'Watched seconds cannot be negative'],
      default: 0
    },
    isCompleted: {
      type: Boolean,
      required: true,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'lesson_progress'
  }
);

// Unique compound constraint per DATABASE_SCHEMA.md
LessonProgressSchema.index({ enrollmentId: 1, lessonId: 1 }, { unique: true });
LessonProgressSchema.index({ userId: 1, courseId: 1 });

LessonProgressSchema.methods.toSafeDTO = function (this: ILessonProgressDocument): ILessonProgressSafeDTO {
  return {
    id: this._id.toString(),
    enrollmentId: this.enrollmentId.toString(),
    userId: this.userId.toString(),
    courseId: this.courseId.toString(),
    lessonId: this.lessonId.toString(),
    status: this.status,
    secondsWatched: this.secondsWatched,
    isCompleted: this.isCompleted,
    completedAt: this.completedAt ? this.completedAt.toISOString() : null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const LessonProgressModel: Model<ILessonProgressDocument> =
  mongoose.models.LessonProgress ||
  mongoose.model<ILessonProgressDocument>('LessonProgress', LessonProgressSchema);
