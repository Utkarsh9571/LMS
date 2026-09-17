import mongoose, { Document, Model, Schema } from 'mongoose';
import { CourseLevel, CourseStatus, CourseDeliveryMode, ICourseSafeDTO } from './domain-types';

export interface ICourseDocument extends Document {
  _id: mongoose.Types.ObjectId;
  slug: string;
  title: string;
  description: string;
  level: CourseLevel;
  thumbnailUrl: string;
  status: CourseStatus;
  deliveryModes: CourseDeliveryMode[];
  estimatedHours: number;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): ICourseSafeDTO;
}

const CourseSchema = new Schema<ICourseDocument>(
  {
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    level: {
      type: String,
      required: [true, 'Level is required'],
      enum: {
        values: ['beginner', 'intermediate', 'advanced', 'professional'],
        message: '{VALUE} is not a valid course level.'
      },
      default: 'beginner'
    },
    thumbnailUrl: {
      type: String,
      required: [true, 'Thumbnail URL is required'],
      trim: true
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['draft', 'published', 'archived'],
        message: '{VALUE} is not a valid course status.'
      },
      default: 'draft',
      index: true
    },
    deliveryModes: {
      type: [
        {
          type: String,
          enum: {
            values: ['self_paced', 'cohort_batch'],
            message: '{VALUE} is not a valid delivery mode.'
          }
        }
      ],
      required: [true, 'At least one delivery mode is required'],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'A course must have at least one delivery mode.'
      },
      default: ['self_paced']
    },
    estimatedHours: {
      type: Number,
      required: [true, 'Estimated hours is required'],
      min: [0, 'Estimated hours cannot be negative'],
      default: 0
    }
  },
  {
    timestamps: true,
    collection: 'courses'
  }
);

CourseSchema.methods.toSafeDTO = function (this: ICourseDocument): ICourseSafeDTO {
  return {
    id: this._id.toString(),
    slug: this.slug,
    title: this.title,
    description: this.description,
    level: this.level,
    thumbnailUrl: this.thumbnailUrl,
    status: this.status,
    deliveryModes: this.deliveryModes,
    estimatedHours: this.estimatedHours,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const CourseModel: Model<ICourseDocument> =
  mongoose.models.Course || mongoose.model<ICourseDocument>('Course', CourseSchema);
