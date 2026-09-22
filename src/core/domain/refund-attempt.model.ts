import mongoose, { Document, Model, Schema } from 'mongoose';
import { CurrencyCode, IRefundAttemptSafeDTO } from './domain-types';

export type RefundAttemptStatus = 'initiated' | 'pending' | 'succeeded' | 'failed' | 'unknown';

export interface IRefundAttemptDocument extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  paymentAttemptId: mongoose.Types.ObjectId;
  refundAttemptNumber: number;
  amountMinorUnits: number;
  currency: CurrencyCode;
  status: RefundAttemptStatus;
  gatewayRefundId?: string | null;
  gatewayPaymentId?: string | null;
  reason?: string | null;
  callerId: mongoose.Types.ObjectId;
  errorCode?: string | null;
  errorMessage?: string | null;
  rawProviderResponse?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IRefundAttemptSafeDTO;
}

const RefundAttemptSchema = new Schema<IRefundAttemptDocument>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      index: true
    },
    paymentAttemptId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentAttempt',
      required: [true, 'Payment attempt ID is required'],
      index: true
    },
    refundAttemptNumber: {
      type: Number,
      required: [true, 'Refund attempt number is required'],
      min: [1, 'Refund attempt number must be >= 1']
    },
    amountMinorUnits: {
      type: Number,
      required: [true, 'Refund amount is required'],
      validate: {
        validator: (val: number) => Number.isInteger(val) && val > 0,
        message: '{VALUE} is not a valid positive integer minor unit value.'
      }
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: {
        values: ['SGD', 'MYR'],
        message: '{VALUE} is not a supported currency.'
      }
    },
    status: {
      type: String,
      required: [true, 'Refund attempt status is required'],
      enum: {
        values: ['initiated', 'pending', 'succeeded', 'failed', 'unknown'],
        message: '{VALUE} is not a valid refund attempt status.'
      },
      default: 'initiated',
      index: true
    },
    gatewayRefundId: {
      type: String,
      sparse: true,
      index: true,
      trim: true
    },
    gatewayPaymentId: {
      type: String,
      trim: true
    },
    reason: {
      type: String,
      trim: true
    },
    callerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Caller ID is required']
    },
    errorCode: {
      type: String,
      trim: true
    },
    errorMessage: {
      type: String,
      trim: true
    },
    rawProviderResponse: {
      type: Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'refund_attempts'
  }
);

RefundAttemptSchema.index({ orderId: 1, refundAttemptNumber: 1 }, { unique: true });

RefundAttemptSchema.methods.toSafeDTO = function (
  this: IRefundAttemptDocument
): IRefundAttemptSafeDTO {
  return {
    id: this._id.toString(),
    orderId: this.orderId.toString(),
    paymentAttemptId: this.paymentAttemptId.toString(),
    refundAttemptNumber: this.refundAttemptNumber,
    amountMinorUnits: this.amountMinorUnits,
    currency: this.currency,
    status: this.status,
    gatewayRefundId: this.gatewayRefundId ?? null,
    gatewayPaymentId: this.gatewayPaymentId ?? null,
    reason: this.reason ?? null,
    callerId: this.callerId.toString(),
    errorMessage: this.errorMessage ?? null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const RefundAttemptModel: Model<IRefundAttemptDocument> =
  mongoose.models.RefundAttempt ||
  mongoose.model<IRefundAttemptDocument>('RefundAttempt', RefundAttemptSchema);
