import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/core/domain/product.model';
import { OfferModel } from '@/core/domain/offer.model';
import { OrderModel } from '@/core/domain/order.model';
import { BatchModel } from '@/core/domain/batch.model';

import { PaymentAttemptModel } from '@/core/domain/payment-attempt.model';
import { MarketModel } from '@/core/domain/market.model';
import { PaymentProviderFactory } from '@/providers/payment/payment-provider.factory';
import {
  ICheckoutInput,
  ICheckoutResultDTO,
  IRetryPaymentResultDTO,
  IOrderSafeDTO,
  MarketCode
} from '@/core/domain/domain-types';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export class OrderService {
  /**
   * Generates a collision-resistant, human-readable order number.
   * Format: ORD-{MARKET}-{YYYYMM}-{RANDOM}
   * e.g. ORD-SG-202609-8A3F1
   */
  private static generateOrderNumber(marketCode: MarketCode): string {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${marketCode}-${yearMonth}-${randomSuffix}`;
  }

  /**
   * Initiates checkout, creates the Order with frozen integer pricing snapshot,
   * spawns PaymentAttempt #1, calls the provider abstraction, and returns the session details.
   */
  static async createCheckoutOrder(
    userId: string,
    resolvedMarket: MarketCode,
    input: ICheckoutInput
  ): Promise<ICheckoutResultDTO> {
    if (!userId) throw new AuthorizationError('Authentication required to checkout.');
    if (!resolvedMarket || !['SG', 'MY'].includes(resolvedMarket)) {
      throw new ValidationError('Invalid or missing market context.');
    }
    if (!input.productId) throw new ValidationError('productId is required.');
    if (input.batchId && !/^[0-9a-fA-F]{24}$/.test(input.batchId)) throw new ValidationError('batchId must be a valid identifier.');
    if (!input.billingDetails) throw new ValidationError('billingDetails are required.');

    const { fullName, email, phone, country } = input.billingDetails;
    if (!fullName || !email || !phone || !country) {
      throw new ValidationError(
        'billingDetails must contain fullName, email, phone, and country.'
      );
    }

    await connectToDatabase();

    // 1. Validate Product
    const product = await ProductModel.findById(input.productId);
    if (!product || !product.isActive) {
      throw new NotFoundError('Product', input.productId);
    }

    // 2. Resolve Market-Specific Offer deterministically (publicly listed, latest created)
    const offer = await OfferModel.findOne({
      productId: product._id,
      marketCode: resolvedMarket,
      status: 'active'
    }).sort({ isPubliclyListed: -1, createdAt: -1 });

    if (!offer || !offer.isSelectable(resolvedMarket)) {
      throw new ValidationError(
        `No active commercial offer found for product ${product.title} in market ${resolvedMarket}.`
      );
    }


    // Validate an optional cohort selection server-side. The client cannot choose an arbitrary batch.
    let selectedBatchId: string | null = null;
    if (input.batchId) {
      const selectedBatch = await BatchModel.findById(input.batchId);
      if (!selectedBatch) throw new NotFoundError('Batch', input.batchId);
      if (selectedBatch.marketCode !== resolvedMarket) throw new ValidationError('Selected batch is not available in this market.');
      if (selectedBatch.status !== 'enrolling') throw new ValidationError('Selected batch is not currently accepting enrollments.');
      const { BatchService } = await import('./batch.service');
      const eligibility = BatchService.isEnrollmentEligible(selectedBatch);
      if (!eligibility.eligible) throw new ValidationError(eligibility.reason || 'Selected batch is not available.');
      const courseDeliverable = product.deliverables.find(d => d.deliverableType === 'course');
      if (!courseDeliverable) throw new ValidationError('A batch can only be selected for a course-based product.');
      if (courseDeliverable.targetId.toString() !== selectedBatch.courseId.toString()) {
        throw new ValidationError('Selected batch does not belong to this course.');
      }
      selectedBatchId = selectedBatch._id.toString();
    }

    // 3. Resolve Market Configuration
    const marketDoc = await MarketModel.findOne({ code: resolvedMarket });
    const paymentProviderType = marketDoc?.paymentProvider || 'mock';
    const paymentConfigurationRef = marketDoc?.paymentConfigurationRef;

    // 4. Calculate Integer Minor Units Pricing
    // Strict integer invariants: subtotal, discount, tax, total
    const subtotalMinorUnits = offer.basePriceMinorUnits;
    if (!Number.isInteger(subtotalMinorUnits) || subtotalMinorUnits <= 0) {
      throw new ValidationError('Invalid product base price configuration.');
    }

    // Coupon support placeholder: Phase 1E preserves couponId & discountMinorUnits on Order schema
    // Full coupon engine is deferred, coupon discount is 0 unless an explicitly validated voucher is applied.
    let discountMinorUnits = 0;
    if (input.couponCode) {
      logger.info('Coupon code provided at checkout (engine deferred)', {
        couponCode: input.couponCode
      });
      // V1 placeholder: no coupons discounted yet
      discountMinorUnits = 0;
    }

    // Tax calculation placeholder: 0 default tax in Phase 1E (GST/SST engine deferred)
    const taxMinorUnits = 0;
    const totalMinorUnits = Math.max(0, subtotalMinorUnits - discountMinorUnits + taxMinorUnits);

    if (!Number.isInteger(totalMinorUnits)) {
      throw new ValidationError('Calculated total must be an integer minor unit value.');
    }

    // 5. Generate Collision-Resistant Order Number
    let orderNumber = this.generateOrderNumber(resolvedMarket);
    let attempts = 0;
    while (await OrderModel.exists({ orderNumber })) {
      attempts++;
      if (attempts > 5) {
        orderNumber = `${orderNumber}-${Date.now().toString().slice(-4)}`;
        break;
      }
      orderNumber = this.generateOrderNumber(resolvedMarket);
    }

    // 6. Create Order document (Snapshot Invariant: frozen commercial agreement)
    const order = await OrderModel.create({
      orderNumber,
      userId,
      marketCode: resolvedMarket,
      productId: product._id,
      batchId: selectedBatchId,
      offerId: offer._id,
      currency: offer.currency,
      subtotalMinorUnits,
      discountMinorUnits,
      taxMinorUnits,
      totalMinorUnits,
      billingDetails: {
        fullName: input.billingDetails.fullName.trim(),
        email: input.billingDetails.email.trim().toLowerCase(),
        phone: input.billingDetails.phone.trim(),
        country: input.billingDetails.country.trim(),
        addressLine1: input.billingDetails.addressLine1?.trim()
      },
      status: 'pending_payment'
    });

    // 7. Create PaymentAttempt #1
    const paymentAttempt = await PaymentAttemptModel.create({
      orderId: order._id,
      attemptNumber: 1,
      marketCode: resolvedMarket,
      provider: paymentProviderType,
      currency: order.currency,
      amountMinorUnits: order.totalMinorUnits,
      status: 'initiated'
    });

    // 8. Call Payment Provider via Abstraction
    const { provider, apiKey } = PaymentProviderFactory.getProvider(
      paymentProviderType,
      paymentConfigurationRef
    );

    let checkoutSession;
    try {
      checkoutSession = await provider.createCheckoutSession(
        {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          paymentAttemptId: paymentAttempt._id.toString(),
          amountMinorUnits: order.totalMinorUnits,
          currency: order.currency,
          customer: {
            name: order.billingDetails.fullName,
            email: order.billingDetails.email,
            phone: order.billingDetails.phone
          },
          description: `Enrollment for ${product.title}`,
          returnUrl: `${input.returnBaseUrl || ''}/orders/${order.orderNumber}/complete`,
          webhookUrl: `${input.returnBaseUrl || ''}/api/webhooks/payments/${paymentProviderType}`,
          marketCode: resolvedMarket
        },
        apiKey
      );
    } catch (providerErr: any) {
      // Cleanly transition attempt to failed and order to payment_failed
      paymentAttempt.status = 'failed';
      paymentAttempt.errorMessage = providerErr.message || 'Provider initialization failed.';
      await paymentAttempt.save();

      order.status = 'payment_failed';
      order.activePaymentAttemptId = paymentAttempt._id;
      await order.save();

      logger.error('Provider checkout initialization failed', {
        orderNumber: order.orderNumber,
        error: providerErr.message
      });

      throw providerErr;
    }

    // 9. Update PaymentAttempt and Order references with sanitized response
    paymentAttempt.externalReference = checkoutSession.externalReference;
    paymentAttempt.rawInitiationResponse = {
      sessionId: checkoutSession.sessionId,
      externalReference: checkoutSession.externalReference,
      redirectUrl: checkoutSession.redirectUrl
    };
    paymentAttempt.status = 'pending';
    await paymentAttempt.save();

    order.activePaymentAttemptId = paymentAttempt._id;
    await order.save();

    logger.info('Checkout order created successfully', {
      orderNumber: order.orderNumber,
      orderId: order._id.toString(),
      paymentAttemptId: paymentAttempt._id.toString(),
      externalReference: checkoutSession.externalReference,
      marketCode: resolvedMarket
    });

    return {
      orderNumber: order.orderNumber,
      paymentAttemptId: paymentAttempt._id.toString(),
      checkoutUrl: checkoutSession.redirectUrl
    };
  }

  /**
   * Retries payment on an existing pending Order without creating duplicate Orders.
   * Concurrency-safe against race conditions with unique (orderId, attemptNumber) index.
   * Marks previous attempts abandoned/failed and spawns PaymentAttempt #N.
   */
  static async retryPayment(
    orderNumber: string,
    userId: string,
    returnBaseUrl?: string
  ): Promise<IRetryPaymentResultDTO> {
    if (!orderNumber) throw new ValidationError('orderNumber is required.');
    if (!userId) throw new AuthorizationError('Authentication required.');

    await connectToDatabase();

    const order = await OrderModel.findOne({ orderNumber });
    if (!order) throw new NotFoundError('Order', orderNumber);

    // Ownership check: users can only retry their own orders
    if (order.userId.toString() !== userId) {
      throw new AuthorizationError('Order does not belong to the authenticated user.');
    }

    // State machine check: cannot retry paid, refunded, or cancelled orders
    if (order.status === 'paid') {
      throw new ValidationError('Order is already paid.');
    }
    if (order.status !== 'pending_payment' && order.status !== 'payment_failed') {
      throw new ValidationError(`Order cannot be retried in status: ${order.status}`);
    }

    // Resolve market provider config
    const marketDoc = await MarketModel.findOne({ code: order.marketCode });
    const paymentProviderType = marketDoc?.paymentProvider || 'mock';
    const paymentConfigurationRef = marketDoc?.paymentConfigurationRef;

    // Retry loop with concurrency conflict handling (max 3 attempts)
    let paymentAttempt: any = null;
    let maxRetries = 3;

    while (maxRetries > 0) {
      const existingAttempts = await PaymentAttemptModel.find({ orderId: order._id }).sort({
        attemptNumber: 1
      });

      const nextAttemptNumber =
        existingAttempts.length > 0
          ? Math.max(...existingAttempts.map((a) => a.attemptNumber)) + 1
          : 1;

      // Mark previous active attempts as abandoned
      await PaymentAttemptModel.updateMany(
        {
          orderId: order._id,
          status: { $in: ['initiated', 'pending'] }
        },
        {
          $set: { status: 'abandoned', errorMessage: 'Superseded by new payment retry.' }
        }
      );

      try {
        paymentAttempt = await PaymentAttemptModel.create({
          orderId: order._id,
          attemptNumber: nextAttemptNumber,
          marketCode: order.marketCode,
          provider: paymentProviderType,
          currency: order.currency,
          amountMinorUnits: order.totalMinorUnits,
          status: 'initiated'
        });
        break; // Successfully created next sequential attempt
      } catch (insertErr: any) {
        // E11000 duplicate key error: concurrent retry raced
        if (insertErr.code === 11000 || insertErr.message?.includes('duplicate key')) {
          maxRetries--;
          logger.warn('Concurrent payment retry detected; recalculating sequence number', {
            orderNumber,
            retriesLeft: maxRetries
          });
          if (maxRetries === 0) {
            throw new ValidationError('Concurrent payment retry conflict. Please try again.');
          }
        } else {
          throw insertErr;
        }
      }
    }

    // Call Provider
    const { provider, apiKey } = PaymentProviderFactory.getProvider(
      paymentProviderType,
      paymentConfigurationRef
    );

    const product = await ProductModel.findById(order.productId);
    const productTitle = product ? product.title : 'Course Bundle';

    let checkoutSession;
    try {
      checkoutSession = await provider.createCheckoutSession(
        {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          paymentAttemptId: paymentAttempt._id.toString(),
          amountMinorUnits: order.totalMinorUnits,
          currency: order.currency,
          customer: {
            name: order.billingDetails.fullName,
            email: order.billingDetails.email,
            phone: order.billingDetails.phone
          },
          description: `Enrollment for ${productTitle} (Retry #${paymentAttempt.attemptNumber})`,
          returnUrl: `${returnBaseUrl || ''}/orders/${order.orderNumber}/complete`,
          webhookUrl: `${returnBaseUrl || ''}/api/webhooks/payments/${paymentProviderType}`,
          marketCode: order.marketCode
        },
        apiKey
      );
    } catch (providerErr: any) {
      paymentAttempt.status = 'failed';
      paymentAttempt.errorMessage = providerErr.message || 'Provider initialization failed on retry.';
      await paymentAttempt.save();

      order.status = 'payment_failed';
      order.activePaymentAttemptId = paymentAttempt._id;
      await order.save();

      throw providerErr;
    }

    paymentAttempt.externalReference = checkoutSession.externalReference;
    paymentAttempt.rawInitiationResponse = {
      sessionId: checkoutSession.sessionId,
      externalReference: checkoutSession.externalReference,
      redirectUrl: checkoutSession.redirectUrl
    };
    paymentAttempt.status = 'pending';
    await paymentAttempt.save();

    order.activePaymentAttemptId = paymentAttempt._id;
    order.status = 'pending_payment';
    await order.save();

    logger.info('Payment retry initiated', {
      orderNumber: order.orderNumber,
      attemptNumber: paymentAttempt.attemptNumber,
      paymentAttemptId: paymentAttempt._id.toString()
    });

    return {
      paymentAttemptId: paymentAttempt._id.toString(),
      checkoutUrl: checkoutSession.redirectUrl
    };
  }


  /**
   * Retrieves an Order for a student, enforcing server-side ownership.
   */
  static async getOrderForUser(orderNumber: string, userId: string): Promise<IOrderSafeDTO> {
    await connectToDatabase();
    const order = await OrderModel.findOne({ orderNumber });
    if (!order) throw new NotFoundError('Order', orderNumber);

    if (order.userId.toString() !== userId) {
      throw new AuthorizationError('You do not have permission to view this order.');
    }

    return order.toSafeDTO();
  }
}
