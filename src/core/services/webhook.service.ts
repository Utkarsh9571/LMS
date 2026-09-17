import crypto from 'node:crypto';
import { connectToDatabase } from '@/lib/db';
import { PaymentWebhookEventModel } from '@/core/domain/payment-webhook-event.model';
import { PaymentAttemptModel } from '@/core/domain/payment-attempt.model';
import { OrderModel } from '@/core/domain/order.model';
import { PaymentProviderFactory } from '@/providers/payment/payment-provider.factory';

import { PaymentFulfillmentService, FulfillmentResult } from './payment-fulfillment.service';
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  PaymentProviderError
} from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface WebhookProcessResult {
  status: 'processed' | 'ignored_duplicate' | 'failed';
  eventId: string;
  orderNumber?: string;
  fulfillment?: FulfillmentResult;
  message?: string;
}

export class WebhookService {
  /**
   * Processes an incoming payment webhook with:
   * 1. Raw body HMAC-SHA256 timing-safe verification
   * 2. Idempotency ledger check (payment_webhook_events)
   * 3. PaymentAttempt and Order resolution
   * 4. Amount and currency verification against persisted Order
   * 5. Stale attempt protection
   * 6. Multi-deliverable fulfillment execution
   */
  static async processWebhook(
    providerName: 'hitpay' | 'mock',
    rawBody: string,
    headers: Record<string, string>
  ): Promise<WebhookProcessResult> {
    await connectToDatabase();

    // 1. Calculate SHA256 payload hash for audit trail
    const payloadHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');

    // 2. Resolve Provider boundary instance
    // Note: Provider verification resolves salt from environment based on market or default reference
    const { provider, secretSalt } = PaymentProviderFactory.getProvider(
      providerName,
      providerName === 'hitpay' ? 'HITPAY_SG' : undefined
    );

    // 3. Verify Signature & Extract Canonical Webhook Data
    const verification = await provider.verifyWebhook(headers, rawBody, secretSalt || '');

    if (!verification.isValid) {
      logger.warn('[WebhookService] Invalid webhook signature rejected', {
        provider: providerName,
        eventId: verification.eventId
      });
      throw new AuthenticationError('Invalid payment webhook signature.');
    }

    const { eventId, externalReference, status, amountMinorUnits, currency } = verification;

    // 4. Idempotency Ledger Check: { provider, eventId }
    const existingEvent = await PaymentWebhookEventModel.findOne({
      provider: providerName,
      eventId
    });

    if (existingEvent) {
      if (existingEvent.status === 'processed') {
        logger.info('[WebhookService] Duplicate webhook event received, skipping fulfillment', {
          provider: providerName,
          eventId
        });
        return {
          status: 'ignored_duplicate',
          eventId,
          message: 'Webhook event already processed.'
        };
      }
    }

    // Record webhook event in ledger
    let webhookEvent = existingEvent;
    if (!webhookEvent) {
      try {
        webhookEvent = await PaymentWebhookEventModel.create({
          provider: providerName,
          eventId,
          status: 'received',
          payloadHash,
          receivedAt: new Date()
        });
      } catch (dupErr: any) {
        // Race condition: another thread inserted it
        logger.info('[WebhookService] Concurrent duplicate event detected on insert', {
          provider: providerName,
          eventId
        });
        return {
          status: 'ignored_duplicate',
          eventId,
          message: 'Webhook event already processed concurrently.'
        };
      }
    }

    // 5. Resolve PaymentAttempt via externalReference
    if (!externalReference) {
      webhookEvent.status = 'failed';
      await webhookEvent.save();
      throw new ValidationError('Missing external payment reference in webhook payload.');
    }

    const paymentAttempt = await PaymentAttemptModel.findOne({
      externalReference
    });

    if (!paymentAttempt) {
      webhookEvent.status = 'failed';
      await webhookEvent.save();
      throw new NotFoundError('PaymentAttempt', externalReference);
    }

    // 6. Resolve Order
    const order = await OrderModel.findById(paymentAttempt.orderId);
    if (!order) {
      webhookEvent.status = 'failed';
      await webhookEvent.save();
      throw new NotFoundError('Order', paymentAttempt.orderId.toString());
    }

    webhookEvent.orderId = order._id;
    webhookEvent.paymentAttemptId = paymentAttempt._id;

    // If market-specific secret salt is needed for verification (e.g. HitPay MY vs SG)
    if (providerName === 'hitpay' && order.marketCode === 'MY') {
      const mySalt = process.env.HITPAY_MY_SALT;
      if (mySalt && mySalt !== secretSalt) {
        const recheck = await provider.verifyWebhook(headers, rawBody, mySalt);
        if (!recheck.isValid) {
          webhookEvent.status = 'failed';
          await webhookEvent.save();
          throw new AuthenticationError('Invalid HitPay MY webhook signature.');
        }
      }
    }

    // 7. Gateway Status Evaluation
    if (status !== 'succeeded') {
      logger.info('[WebhookService] Payment attempt reported non-succeeded status', {
        status,
        externalReference,
        orderNumber: order.orderNumber
      });
      paymentAttempt.status = 'failed';
      paymentAttempt.errorMessage = `Provider reported status: ${status}`;
      await paymentAttempt.save();

      webhookEvent.status = 'processed';
      webhookEvent.processedAt = new Date();
      await webhookEvent.save();

      return {
        status: 'processed',
        eventId,
        orderNumber: order.orderNumber,
        message: `Payment attempt marked failed (${status}).`
      };
    }

    // 8. Amount and Currency Integrity Check (DATABASE_SCHEMA.md & COMMERCE.md)
    // Compare received amount against order.totalMinorUnits and order.currency
    const isCurrencyMatch = currency.toUpperCase() === order.currency.toUpperCase();
    const isAmountMatch = amountMinorUnits === order.totalMinorUnits;

    if (!isCurrencyMatch || !isAmountMatch) {
      logger.error('[WebhookService] Amount or currency mismatch detected in webhook payment', {
        orderNumber: order.orderNumber,
        expectedCurrency: order.currency,
        receivedCurrency: currency,
        expectedAmountMinorUnits: order.totalMinorUnits,
        receivedAmountMinorUnits: amountMinorUnits
      });

      paymentAttempt.status = 'failed';
      paymentAttempt.errorMessage = `amount_mismatch: expected ${order.currency} ${order.totalMinorUnits}, received ${currency} ${amountMinorUnits}`;
      await paymentAttempt.save();

      webhookEvent.status = 'failed';
      await webhookEvent.save();

      throw new PaymentProviderError(
        `Payment amount or currency mismatch. Expected ${order.currency} ${order.totalMinorUnits}, received ${currency} ${amountMinorUnits}`
      );
    }

    // 9. Stale Attempt Protection
    // If order is already paid by another attempt, reject stale attempt
    if (
      order.status === 'paid' &&
      order.activePaymentAttemptId &&
      order.activePaymentAttemptId.toString() !== paymentAttempt._id.toString()
    ) {
      logger.warn('[WebhookService] Stale payment attempt callback rejected for already paid order', {
        orderNumber: order.orderNumber,
        activeAttemptId: order.activePaymentAttemptId.toString(),
        staleAttemptId: paymentAttempt._id.toString()
      });

      paymentAttempt.status = 'abandoned';
      paymentAttempt.errorMessage = 'Callback arrived after order was already fulfilled by another attempt.';
      await paymentAttempt.save();

      webhookEvent.status = 'processed';
      webhookEvent.processedAt = new Date();
      await webhookEvent.save();

      return {
        status: 'processed',
        eventId,
        orderNumber: order.orderNumber,
        message: 'Stale attempt ignored; order already paid.'
      };
    }

    // 10. Execute Transactional / Multi-Deliverable Fulfillment
    const fulfillment = await PaymentFulfillmentService.fulfillPaidOrder(
      order._id.toString(),
      paymentAttempt._id.toString(),
      new Date()
    );

    // 11. Mark Webhook Event Processed
    webhookEvent.status = 'processed';
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();

    logger.info('[WebhookService] Webhook successfully processed and order fulfilled', {
      orderNumber: order.orderNumber,
      eventId
    });

    return {
      status: 'processed',
      eventId,
      orderNumber: order.orderNumber,
      fulfillment
    };
  }
}
