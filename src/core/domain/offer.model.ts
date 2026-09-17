import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  CurrencyCode,
  MarketCode,
  OfferStatus,
  IOfferSafeDTO
} from './domain-types';

export interface IOfferDocument extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;

  marketCode: MarketCode;
  currency: CurrencyCode;
  basePriceMinorUnits: number;
  displayOriginalPriceMinorUnits?: number | null;
  isPubliclyListed: boolean;
  status: OfferStatus;
  validFrom?: Date | null;
  validUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isSelectable(targetMarket: MarketCode, atDate?: Date): boolean;
  toSafeDTO(): IOfferSafeDTO;
}

const OfferSchema = new Schema<IOfferDocument>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true
    },
    marketCode: {
      type: String,
      required: [true, 'Market code is required'],
      enum: {
        values: ['SG', 'MY'],
        message: '{VALUE} is not a supported market code.'
      },
      index: true
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: {
        values: ['SGD', 'MYR'],
        message: '{VALUE} is not a supported currency.'
      },
      validate: {
        validator: function (this: IOfferDocument, currency: string) {
          if (this.marketCode === 'SG' && currency !== 'SGD') return false;
          if (this.marketCode === 'MY' && currency !== 'MYR') return false;
          return true;
        },
        message: 'Offer currency must match configured market currency (SG -> SGD, MY -> MYR).'
      }
    },
    basePriceMinorUnits: {
      type: Number,
      required: [true, 'Base price is required'],
      validate: {
        validator: (val: number) => Number.isInteger(val) && val >= 0,
        message: '{VALUE} is not a valid non-negative integer minor unit value.'
      }
    },
    displayOriginalPriceMinorUnits: {
      type: Number,
      default: null,
      validate: {
        validator: (val: number | null | undefined) =>
          val === null || val === undefined || (Number.isInteger(val) && val >= 0),
        message: '{VALUE} is not a valid non-negative integer minor unit value.'
      }
    },

    isPubliclyListed: {
      type: Boolean,
      default: true,
      index: true
    },
    status: {
      type: String,
      required: [true, 'Offer status is required'],
      enum: {
        values: ['active', 'expired', 'disabled'],
        message: '{VALUE} is not a valid offer status.'
      },
      default: 'active',
      index: true
    },
    validFrom: {
      type: Date,
      default: null
    },
    validUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'offers'
  }
);

// Compound index per DATABASE_SCHEMA.md
OfferSchema.index({ productId: 1, marketCode: 1 });
OfferSchema.index({ productId: 1, marketCode: 1, status: 1, isPubliclyListed: 1 });

OfferSchema.methods.isSelectable = function (
  this: IOfferDocument,
  targetMarket: MarketCode,
  atDate?: Date
): boolean {
  if (this.status !== 'active') return false;
  if (this.marketCode !== targetMarket) return false;

  const checkDate = atDate || new Date();
  if (this.validFrom && checkDate < this.validFrom) return false;
  if (this.validUntil && checkDate >= this.validUntil) return false;

  return true;
};

OfferSchema.methods.toSafeDTO = function (this: IOfferDocument): IOfferSafeDTO {
  return {
    id: this._id.toString(),
    productId: this.productId.toString(),
    marketCode: this.marketCode,
    currency: this.currency,
    basePriceMinorUnits: this.basePriceMinorUnits,
    displayOriginalPriceMinorUnits: this.displayOriginalPriceMinorUnits ?? null,
    isPubliclyListed: this.isPubliclyListed,
    status: this.status,
    validFrom: this.validFrom ? this.validFrom.toISOString() : null,
    validUntil: this.validUntil ? this.validUntil.toISOString() : null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const OfferModel: Model<IOfferDocument> =
  mongoose.models.Offer || mongoose.model<IOfferDocument>('Offer', OfferSchema);
