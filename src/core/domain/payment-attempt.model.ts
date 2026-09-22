import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  CurrencyCode,
  MarketCode,
  PaymentAttemptStatus,
  IPaymentAttemptSafeDTO
} from './domain-types';


export interface IPaymentAttemptDocument extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  attemptNumber: number;
  marketCode: MarketCode;
  provider: 'hitpay' | 'mock';
  externalReference?: string | null;
  gatewayPaymentId?: string | null;
  currency: CurrencyCode;
  amountMinorUnits: number;
  paymentMethod?: string | null;
  status: PaymentAttemptStatus;
  errorMessage?: string | null;
  rawInitiationResponse?: Record<string, unknown> | null;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IPaymentAttemptSafeDTO;
}

const PaymentAttemptSchema = new Schema<IPaymentAttemptDocument>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      index: true
    },
    attemptNumber: {
      type: Number,
      required: [true, 'Attempt number is required'],
      min: [1, 'Attempt number must be >= 1'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer attempt number.'
      }
    },
    marketCode: {
      type: String,
      required: [true, 'Market code is required'],
      enum: {
        values: ['SG', 'MY'],
        message: '{VALUE} is not a supported market code.'
      }
    },
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      enum: {
        values: ['hitpay', 'mock'],
        message: '{VALUE} is not a supported payment provider.'
      }
    },
    externalReference: {
      type: String,
      sparse: true,
      index: true,
      trim: true
    },
    gatewayPaymentId: {
      type: String,
      sparse: true,
      index: true,
      trim: true
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: {
        values: ['SGD', 'MYR'],
        message: '{VALUE} is not a supported currency.'
      }
    },
    amountMinorUnits: {
      type: Number,
      required: [true, 'Amount is required'],
      validate: {
        validator: (val: number) => Number.isInteger(val) && val >= 0,
        message: '{VALUE} is not a valid non-negative integer minor unit value.'
      }
    },

    paymentMethod: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      required: [true, 'Payment attempt status is required'],
      enum: {
        values: ['initiated', 'pending', 'succeeded', 'failed', 'abandoned'],
        message: '{VALUE} is not a valid payment attempt status.'
      },
      default: 'initiated',
      index: true
    },
    errorMessage: {
      type: String,
      trim: true
    },
    rawInitiationResponse: {
      type: Schema.Types.Mixed,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'payment_attempts'
  }
);

// Compound index per DATABASE_SCHEMA.md
PaymentAttemptSchema.index({ orderId: 1, attemptNumber: 1 }, { unique: true });

PaymentAttemptSchema.methods.toSafeDTO = function (
  this: IPaymentAttemptDocument
): IPaymentAttemptSafeDTO {
  return {
    id: this._id.toString(),
    orderId: this.orderId.toString(),
    attemptNumber: this.attemptNumber,
    marketCode: this.marketCode,
    provider: this.provider,
    externalReference: this.externalReference ?? null,
    gatewayPaymentId: this.gatewayPaymentId ?? null,
    currency: this.currency,
    amountMinorUnits: this.amountMinorUnits,
    paymentMethod: this.paymentMethod ?? null,
    status: this.status,
    errorMessage: this.errorMessage ?? null,
    paidAt: this.paidAt ? this.paidAt.toISOString() : null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const PaymentAttemptModel: Model<IPaymentAttemptDocument> =
  mongoose.models.PaymentAttempt ||
  mongoose.model<IPaymentAttemptDocument>('PaymentAttempt', PaymentAttemptSchema);
