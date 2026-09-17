import mongoose, { Document, Model, Schema } from 'mongoose';
import { MarketCode, CurrencyCode } from './domain-types';

export interface IMarketDocument extends Document {
  _id: mongoose.Types.ObjectId;
  code: MarketCode;
  name: string;
  countryCode: string;
  currency: CurrencyCode;
  currencyMinorUnits: number;
  timezone: string;
  domains: string[];
  locale: string;
  status: 'active' | 'maintenance' | 'inactive';
  paymentProvider: 'hitpay' | 'mock';
  paymentConfigurationRef: string;
  supportedPaymentMethods: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MarketSchema = new Schema<IMarketDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      enum: ['SG', 'MY'],
      index: true
    },
    name: {
      type: String,
      required: true
    },
    countryCode: {
      type: String,
      required: true
    },
    currency: {
      type: String,
      required: true,
      enum: ['SGD', 'MYR']
    },
    currencyMinorUnits: {
      type: Number,
      required: true,
      default: 2
    },
    timezone: {
      type: String,
      required: true
    },
    domains: {
      type: [String],
      required: true,
      default: []
    },
    locale: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'inactive'],
      default: 'active',
      required: true
    },
    paymentProvider: {
      type: String,
      enum: ['hitpay', 'mock'],
      default: 'mock',
      required: true
    },
    paymentConfigurationRef: {
      type: String,
      required: true
    },
    supportedPaymentMethods: {
      type: [String],
      default: ['card']
    }
  },
  {
    timestamps: true,
    collection: 'markets'
  }
);

export const MarketModel: Model<IMarketDocument> =
  mongoose.models.Market || mongoose.model<IMarketDocument>('Market', MarketSchema);
