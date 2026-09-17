import crypto from 'node:crypto';
import { connectToDatabase } from '@/lib/db';
import { PaymentWebhookEventModel } from '@/core/domain/payment-webhook-event.model';
import { PaymentAttemptModel } from '@/core/domain/payment-attempt.model';
import { OrderModel } from '@/core/domain/order.model';
import { MarketModel } from '@/core/domain/market.model';
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

    // 2. Parse raw payload to extract canonical gateway identifiers
    let parsed: Record<string, any> = {};
    try {
      if (rawBody.trim().startsWith('{')) {
        parsed = JSON.parse(rawBody);
      } else {
        const params = new URLSearchParams(rawBody);
        parsed = Object.fromEntries(params.entries());
      }
    } catch {
      throw new ValidationError('Malformed payment webhook payload.');
    }

    // Extract identifiers
    const eventId = String(
      parsed.payment_id || parsed.id || parsed.eventId || `evt_${Date.now()}`
    );
    const externalReference = String(
      parsed.payment_request_id || parsed.reference_number || parsed.externalReference || ''
    );

    if (!externalReference) {
      throw new ValidationError('Missing external payment reference in webhook payload.');
    }

    // 3. Idempotency Ledger Check: { provider, eventId }
    const existingEvent = await PaymentWebhookEventModel.findOne({
      provider: providerName,
      eventId
    });

    if (existingEvent && existingEvent.status === 'processed') {
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

    // 4. Resolve PaymentAttempt via externalReference
    const paymentAttempt = await PaymentAttemptModel.findOne({
      externalReference
    });

    if (!paymentAttempt) {
      throw new NotFoundError('PaymentAttempt', externalReference);
    }

    // 5. Resolve Order to determine market context
    const order = await OrderModel.findById(paymentAttempt.orderId);
    if (!order) {
      throw new NotFoundError('Order', paymentAttempt.orderId.toString());
    }

    // 6. Resolve Market payment configuration reference
    const marketDoc = await MarketModel.findOne({ code: order.marketCode });
    const paymentConfigRef =
      marketDoc?.paymentConfigurationRef ||
      (order.marketCode === 'MY' ? 'HITPAY_MY' : 'HITPAY_SG');

    // 7. Resolve Provider credentials with the exact market-specific reference
    const { provider, secretSalt } = PaymentProviderFactory.getProvider(
      providerName,
      paymentConfigRef,
      { forceType: true }
    );

    // 8. Cryptographically verify signature using the market-specific secret salt
    const verification = await provider.verifyWebhook(headers, rawBody, secretSalt || '');

    if (!verification.isValid) {
      logger.warn('[WebhookService] Invalid webhook signature rejected', {
        provider: providerName,
        marketCode: order.marketCode,
        configRef: paymentConfigRef,
        eventId
      });
      throw new AuthenticationError('Invalid payment webhook signature.');
    }

    // Record webhook event in ledger if not yet recorded
    let webhookEvent = existingEvent;
    if (!webhookEvent) {
      try {
        webhookEvent = await PaymentWebhookEventModel.create({
          provider: providerName,
          eventId,
          orderId: order._id,
          paymentAttemptId: paymentAttempt._id,
          status: 'received',
          payloadHash,
          receivedAt: new Date()
        });
      } catch {
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
    } else {
      webhookEvent.orderId = order._id;
      webhookEvent.paymentAttemptId = paymentAttempt._id;
      await webhookEvent.save();
    }

    const { status, amountMinorUnits, currency } = verification;

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
    let fulfillment;
    try {
      fulfillment = await PaymentFulfillmentService.fulfillPaidOrder(
        order._id.toString(),
        paymentAttempt._id.toString(),
        new Date()
      );
    } catch (fulfillErr: any) {
      logger.error('[WebhookService] Transactional fulfillment failed; executing out-of-transaction reconciliation', {
        orderNumber: order.orderNumber,
        error: fulfillErr.message
      });

      // Out-of-transaction compensation write:
      // Money was captured externally by gateway, but internal delivery allocation failed (e.g. BATCH_CAPACITY_EXCEEDED)
      paymentAttempt.status = 'succeeded';
      paymentAttempt.paidAt = new Date();
      paymentAttempt.errorMessage = `Fulfillment failed: ${fulfillErr.message}`;
      await paymentAttempt.save();

      order.status = 'fulfillment_failed';
      order.fulfillmentError = fulfillErr.message;
      order.activePaymentAttemptId = paymentAttempt._id;
      await order.save();

      webhookEvent.status = 'processed';
      webhookEvent.processedAt = new Date();
      await webhookEvent.save();

      return {
        status: 'processed',
        eventId,
        orderNumber: order.orderNumber,
        message: `Payment succeeded at gateway, but fulfillment failed: ${fulfillErr.message}. Marked for administrative reconciliation.`
      };
    }

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
