import {
  IPaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  WebhookVerificationResult
} from './payment-provider.interface';
import { logger } from '@/lib/logger';

/**
 * Mock Payment Provider Implementation
 * 
 * Invariants:
 * - Never calls external networks or live payment gateways
 * - Generates simulated session IDs and redirect URLs
 * - Supports controlled simulation of success, failure, and amount mismatches for development testing
 */
export class MockPaymentProvider implements IPaymentProvider {
  public readonly providerName = 'mock';

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const sessionId = `mock_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const externalReference = `mock_ref_${params.paymentAttemptId}`;

    logger.info('[MockPaymentProvider] Created checkout session', {
      orderNumber: params.orderNumber,
      amountMinorUnits: params.amountMinorUnits,
      currency: params.currency,
      marketCode: params.marketCode,
      sessionId
    });

    // In local dev, redirects to a simulated checkout endpoint/page
    const redirectUrl = `/mock-checkout?sessionId=${sessionId}&orderNumber=${params.orderNumber}&attemptId=${params.paymentAttemptId}&amount=${params.amountMinorUnits}&currency=${params.currency}`;

    return {
      sessionId,
      externalReference,
      redirectUrl
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: string,
    secretSalt: string
  ): Promise<WebhookVerificationResult> {
    logger.info('[MockPaymentProvider] Verifying mock webhook', { secretSaltProvided: Boolean(secretSalt) });

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return {
        isValid: false,
        eventId: `mock_evt_invalid_${Date.now()}`,
        externalReference: '',
        status: 'failed',
        amountMinorUnits: 0,
        currency: 'SGD',
        rawPayload: {}
      };
    }

    const eventId = String(parsed.eventId || `mock_evt_${Date.now()}`);
    const externalReference = String(parsed.externalReference || '');
    const status = (parsed.status === 'succeeded' || parsed.status === 'failed') ? parsed.status : 'succeeded';
    const amountMinorUnits = typeof parsed.amountMinorUnits === 'number' ? parsed.amountMinorUnits : 0;
    const currency = typeof parsed.currency === 'string' ? parsed.currency : 'SGD';
    const paymentMethod = typeof parsed.paymentMethod === 'string' ? parsed.paymentMethod : 'mock_card';

    return {
      isValid: true,
      eventId,
      externalReference,
      status,
      amountMinorUnits,
      currency,
      paymentMethod,
      rawPayload: parsed
    };
  }

  async refundPayment(params: import('./payment-provider.interface').RefundParams): Promise<import('./payment-provider.interface').RefundProviderResult> {
    logger.info('[MockPaymentProvider] Executing mock refund', {
      gatewayPaymentId: params.gatewayPaymentId,
      amountMinorUnits: params.amountMinorUnits,
      currency: params.currency
    });

    if (params.gatewayPaymentId.includes('fail_refund')) {
      return {
        success: false,
        status: 'failed',
        errorMessage: 'Mock refund forced failure for testing.',
        rawPayload: { mockStatus: 'failed' }
      };
    }

    if (params.gatewayPaymentId.includes('unknown_refund')) {
      return {
        success: false,
        status: 'unknown',
        errorMessage: 'Mock refund ambiguous transport timeout.',
        rawPayload: { mockStatus: 'unknown' }
      };
    }

    const gatewayRefundId = `mock_rf_${params.gatewayPaymentId}`;

    return {
      success: true,
      status: 'succeeded',
      gatewayRefundId,
      rawPayload: { mockStatus: 'succeeded', gatewayRefundId }
    };
  }
}
