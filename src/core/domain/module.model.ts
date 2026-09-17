import mongoose, { Document, Model, Schema } from 'mongoose';
import { IModuleSafeDTO } from './domain-types';

export interface IModuleDocument extends Document {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  dripDaysAfterEnrollment: number;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IModuleSafeDTO;
}

const ModuleSchema = new Schema<IModuleDocument>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      required: [true, 'Module order is required'],
      min: [0, 'Order cannot be negative'],
      default: 0
    },
    dripDaysAfterEnrollment: {
      type: Number,
      required: true,
      min: [0, 'Drip days after enrollment cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} must be an integer number of days.'
      }
    }
  },
  {
    timestamps: true,
    collection: 'modules'
  }
);

// Compound index to optimize deterministic ordering within a course
ModuleSchema.index({ courseId: 1, order: 1 });

ModuleSchema.methods.toSafeDTO = function (this: IModuleDocument): IModuleSafeDTO {
  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    title: this.title,
    description: this.description,
    order: this.order,
    dripDaysAfterEnrollment: this.dripDaysAfterEnrollment,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const ModuleModel: Model<IModuleDocument> =
  mongoose.models.Module || mongoose.model<IModuleDocument>('Module', ModuleSchema);
