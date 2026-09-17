import mongoose, { Document, Model, Schema } from 'mongoose';
import { WebhookEventStatus, IPaymentWebhookEventDTO } from './domain-types';

export interface IPaymentWebhookEventDocument extends Document {
  _id: mongoose.Types.ObjectId;
  provider: string;
  eventId: string;
  orderId?: mongoose.Types.ObjectId | null;
  paymentAttemptId?: mongoose.Types.ObjectId | null;
  status: WebhookEventStatus;
  payloadHash: string;
  receivedAt: Date;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IPaymentWebhookEventDTO;
}

const PaymentWebhookEventSchema = new Schema<IPaymentWebhookEventDocument>(
  {
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      trim: true
    },
    eventId: {
      type: String,
      required: [true, 'Event ID is required'],
      trim: true
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    paymentAttemptId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentAttempt',
      default: null
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['received', 'processed', 'ignored_duplicate', 'failed'],
        message: '{VALUE} is not a valid webhook event status.'
      },
      default: 'received',
      index: true
    },
    payloadHash: {
      type: String,
      required: [true, 'Payload hash is required'],
      trim: true
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    processedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'payment_webhook_events'
  }
);

// Compound Unique Index per DATABASE_SCHEMA.md: { provider: 1, eventId: 1 }
PaymentWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

PaymentWebhookEventSchema.methods.toSafeDTO = function (
  this: IPaymentWebhookEventDocument
): IPaymentWebhookEventDTO {
  return {
    id: this._id.toString(),
    provider: this.provider,
    eventId: this.eventId,
    orderId: this.orderId ? this.orderId.toString() : null,
    paymentAttemptId: this.paymentAttemptId ? this.paymentAttemptId.toString() : null,
    status: this.status,
    payloadHash: this.payloadHash,
    receivedAt: this.receivedAt.toISOString(),
    processedAt: this.processedAt ? this.processedAt.toISOString() : null
  };
};

export const PaymentWebhookEventModel: Model<IPaymentWebhookEventDocument> =
  mongoose.models.PaymentWebhookEvent ||
  mongoose.model<IPaymentWebhookEventDocument>('PaymentWebhookEvent', PaymentWebhookEventSchema);
