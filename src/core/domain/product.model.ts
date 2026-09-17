import mongoose, { Document, Model, Schema } from 'mongoose';
import { IProductSafeDTO, V1DeliverableType } from './domain-types';


export interface IProductDeliverableDocument {
  deliverableType: V1DeliverableType;
  targetId: mongoose.Types.ObjectId;
  titleOverride?: string;
  order?: number;
}

export interface IProductDocument extends Document {
  _id: mongoose.Types.ObjectId;
  slug: string;
  title: string;
  description: string;
  deliverables: IProductDeliverableDocument[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IProductSafeDTO;
}

const ProductDeliverableSchema = new Schema<IProductDeliverableDocument>(
  {
    deliverableType: {
      type: String,
      required: [true, 'Deliverable type is required'],
      enum: {
        values: ['course', 'batch'],
        message: '{VALUE} is not a valid deliverable type.'
      }
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Target ID is required']
    },
    titleOverride: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const ProductSchema = new Schema<IProductDocument>(
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
    deliverables: {
      type: [ProductDeliverableSchema],
      default: [],
      validate: {
        validator: function (deliverables: IProductDeliverableDocument[]) {
          return Array.isArray(deliverables) && deliverables.length > 0;
        },
        message: 'A product must have at least one deliverable.'
      }
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'products'
  }
);

ProductSchema.methods.toSafeDTO = function (this: IProductDocument): IProductSafeDTO {
  return {
    id: this._id.toString(),
    slug: this.slug,
    title: this.title,
    description: this.description,
    deliverables: (this.deliverables || []).map((d) => ({
      deliverableType: d.deliverableType,
      targetId: d.targetId.toString(),
      titleOverride: d.titleOverride,
      order: d.order
    })),
    isActive: this.isActive,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const ProductModel: Model<IProductDocument> =
  mongoose.models.Product || mongoose.model<IProductDocument>('Product', ProductSchema);
