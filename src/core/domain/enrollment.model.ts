import mongoose, { Document, Model, Schema } from 'mongoose';
import { EnrollmentStatus, IEnrollmentSafeDTO } from './domain-types';

export interface IEnrollmentDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId | null;
  entitlementId: mongoose.Types.ObjectId;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt?: Date | null;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IEnrollmentSafeDTO;
}

const EnrollmentSchema = new Schema<IEnrollmentDocument>(
  {
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
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      default: null
    },
    entitlementId: {
      type: Schema.Types.ObjectId,
      ref: 'Entitlement',
      required: [true, 'Entitlement ID is required']
    },
    status: {
      type: String,
      required: [true, 'Enrollment status is required'],
      enum: {
        values: ['active', 'completed', 'dropped'],
        message: '{VALUE} is not a valid enrollment status.'
      },
      default: 'active',
      index: true
    },
    enrolledAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    progressPercent: {
      type: Number,
      required: true,
      min: [0, 'Progress percentage cannot be negative'],
      max: [100, 'Progress percentage cannot exceed 100'],
      default: 0
    }
  },
  {
    timestamps: true,
    collection: 'enrollments'
  }
);

// Unique compound constraint per DATABASE_SCHEMA.md
EnrollmentSchema.index({ userId: 1, courseId: 1, batchId: 1 }, { unique: true });
EnrollmentSchema.index({ userId: 1, status: 1 });

EnrollmentSchema.methods.toSafeDTO = function (this: IEnrollmentDocument): IEnrollmentSafeDTO {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    courseId: this.courseId.toString(),
    batchId: this.batchId ? this.batchId.toString() : null,
    entitlementId: this.entitlementId.toString(),
    status: this.status,
    enrolledAt: this.enrolledAt.toISOString(),
    completedAt: this.completedAt ? this.completedAt.toISOString() : null,
    progressPercent: this.progressPercent,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const EnrollmentModel: Model<IEnrollmentDocument> =
  mongoose.models.Enrollment || mongoose.model<IEnrollmentDocument>('Enrollment', EnrollmentSchema);
