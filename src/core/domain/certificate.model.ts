import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  ICertificateBatchSnapshot,
  ICertificateCourseSnapshot,
  ICertificateInstructorSnapshot,
  ICertificateSafeDTO,
  ICertificateStudentSnapshot,
  MarketCode
} from './domain-types';

export interface ICertificateDocument extends Document {
  _id: mongoose.Types.ObjectId;
  certificateNumber: string;
  enrollmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId | null;
  marketCode: MarketCode;
  studentSnapshot: ICertificateStudentSnapshot;
  courseSnapshot: ICertificateCourseSnapshot;
  batchSnapshot?: ICertificateBatchSnapshot | null;
  primaryInstructorSnapshot?: ICertificateInstructorSnapshot | null;
  issuedAt: Date;
  verificationUrl: string;
  isRevoked: boolean;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): ICertificateSafeDTO;
}

const CertificateStudentSnapshotSchema = new Schema<ICertificateStudentSnapshot>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true }
  },
  { _id: false }
);

const CertificateCourseSnapshotSchema = new Schema<ICertificateCourseSnapshot>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    estimatedHours: { type: Number, required: true }
  },
  { _id: false }
);

const CertificateBatchSnapshotSchema = new Schema<ICertificateBatchSnapshot>(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    completedAt: { type: String }
  },
  { _id: false }
);

const CertificateInstructorSnapshotSchema = new Schema<ICertificateInstructorSnapshot>(
  {
    fullName: { type: String, required: true }
  },
  { _id: false }
);

const CertificateSchema = new Schema<ICertificateDocument>(
  {
    certificateNumber: {
      type: String,
      required: [true, 'Certificate number is required'],
      unique: true,
      trim: true,
      index: true
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment ID is required'],
      unique: true,
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
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      index: true
    },
    marketCode: {
      type: String,
      required: true,
      enum: ['SG', 'MY']
    },
    studentSnapshot: {
      type: CertificateStudentSnapshotSchema,
      required: true
    },
    courseSnapshot: {
      type: CertificateCourseSnapshotSchema,
      required: true
    },
    batchSnapshot: {
      type: CertificateBatchSnapshotSchema,
      default: null
    },
    primaryInstructorSnapshot: {
      type: CertificateInstructorSnapshotSchema,
      default: null
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    verificationUrl: {
      type: String,
      required: true,
      trim: true
    },
    isRevoked: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'certificates'
  }
);

// Indexes
CertificateSchema.index({ userId: 1, courseId: 1 });
CertificateSchema.index({ marketCode: 1, issuedAt: -1 });

CertificateSchema.methods.toSafeDTO = function (this: ICertificateDocument): ICertificateSafeDTO {
  return {
    id: this._id.toString(),
    certificateNumber: this.certificateNumber,
    enrollmentId: this.enrollmentId.toString(),
    userId: this.userId.toString(),
    courseId: this.courseId.toString(),
    batchId: this.batchId ? this.batchId.toString() : null,
    marketCode: this.marketCode,
    studentSnapshot: {
      fullName: this.studentSnapshot.fullName,
      email: this.studentSnapshot.email
    },
    courseSnapshot: {
      title: this.courseSnapshot.title,
      slug: this.courseSnapshot.slug,
      estimatedHours: this.courseSnapshot.estimatedHours
    },
    batchSnapshot: this.batchSnapshot
      ? {
          code: this.batchSnapshot.code,
          name: this.batchSnapshot.name,
          completedAt: this.batchSnapshot.completedAt ?? null
        }
      : null,
    primaryInstructorSnapshot: this.primaryInstructorSnapshot
      ? { fullName: this.primaryInstructorSnapshot.fullName }
      : null,
    issuedAt: this.issuedAt.toISOString(),
    verificationUrl: this.verificationUrl,
    isRevoked: this.isRevoked,
    revokedAt: this.revokedAt ? this.revokedAt.toISOString() : null,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString()
  };
};

export const CertificateModel: Model<ICertificateDocument> =
  mongoose.models.Certificate ||
  mongoose.model<ICertificateDocument>('Certificate', CertificateSchema);
