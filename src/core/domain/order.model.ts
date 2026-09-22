import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  CurrencyCode,
  MarketCode,
  OrderStatus,
  IBillingDetails,
  IOrderSafeDTO
} from './domain-types';


export interface IOrderDocument extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  userId: mongoose.Types.ObjectId;
  marketCode: MarketCode;
  productId: mongoose.Types.ObjectId;
  /** Optional batch selected during public cohort checkout. */
  batchId?: mongoose.Types.ObjectId | null;
  offerId: mongoose.Types.ObjectId;
  currency: CurrencyCode;
  subtotalMinorUnits: number;
  discountMinorUnits: number;
  couponId?: mongoose.Types.ObjectId | null;
  taxMinorUnits: number;
  totalMinorUnits: number;
  billingDetails: IBillingDetails;
  status: OrderStatus;
  fulfillmentError?: string | null;
  activePaymentAttemptId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  toSafeDTO(): IOrderSafeDTO;
}

const BillingDetailsSchema = new Schema<IBillingDetails>(
  {
    fullName: {
      type: String,
      required: [true, 'Billing full name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Billing email is required'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Billing phone is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Billing country is required'],
      trim: true
    },
    addressLine1: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      index: true,
      trim: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
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
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required']
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      index: true
    },
    offerId: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
      required: [true, 'Offer ID is required']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: {
        values: ['SGD', 'MYR'],
        message: '{VALUE} is not a supported currency.'
      }
    },
    subtotalMinorUnits: {
      type: Number,
      required: [true, 'Subtotal is required'],
      validate: {
        validator: (val: number) => Number.isInteger(val) && val >= 0,
        message: '{VALUE} is not a valid non-negative integer minor unit value.'
      }
    },
    discountMinorUnits: {
      type: Number,
      default: 0,
      validate: {
        validator: (val: number) => Number.isInteger(val) && val >= 0,
        message: '{VALUE} is not a valid non-negative integer discount.'
      }
    },
    couponId: {
      type: Schema.Types.ObjectId,
      default: null
    },
    taxMinorUnits: {
      type: Number,
      default: 0,
      validate: {
        validator: (val: number) => Number.isInteger(val) && val >= 0,
        message: '{VALUE} is not a valid non-negative integer tax.'
      }
    },
    totalMinorUnits: {
      type: Number,
      required: [true, 'Total is required'],
      validate: {
        validator: (val: number) => Number.isInteger(val) && val >= 0,
        message: '{VALUE} is not a valid non-negative integer minor unit value.'
      }
    },
    billingDetails: {

      type: BillingDetailsSchema,
      required: [true, 'Billing details are required']
    },
    status: {
      type: String,
      required: [true, 'Order status is required'],
      enum: {
        values: ['pending_payment', 'paid', 'payment_failed', 'fulfillment_failed', 'refunded', 'cancelled'],
        message: '{VALUE} is not a valid order status.'
      },
      default: 'pending_payment',
      index: true
    },
    fulfillmentError: {
      type: String,
      default: null
    },
    activePaymentAttemptId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentAttempt',
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'orders'
  }
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ marketCode: 1, status: 1 });
OrderSchema.index({ batchId: 1, createdAt: -1 });

OrderSchema.methods.toSafeDTO = function (this: IOrderDocument): IOrderSafeDTO {
  return {
    id: this._id.toString(),
    orderNumber: this.orderNumber,
    userId: this.userId.toString(),
    marketCode: this.marketCode,
    productId: this.productId.toString(),
    offerId: this.offerId.toString(),
    currency: this.currency,
    subtotalMinorUnits: this.subtotalMinorUnits,
    discountMinorUnits: this.discountMinorUnits,
    couponId: this.couponId ? this.couponId.toString() : null,
    taxMinorUnits: this.taxMinorUnits,
    totalMinorUnits: this.totalMinorUnits,
    billingDetails: {
      fullName: this.billingDetails.fullName,
      email: this.billingDetails.email,
      phone: this.billingDetails.phone,
      country: this.billingDetails.country,
      addressLine1: this.billingDetails.addressLine1
    },
    status: this.status,
    fulfillmentError: this.fulfillmentError || null,
    activePaymentAttemptId: this.activePaymentAttemptId
      ? this.activePaymentAttemptId.toString()
      : null,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const OrderModel: Model<IOrderDocument> =
  mongoose.models.Order || mongoose.model<IOrderDocument>('Order', OrderSchema);
