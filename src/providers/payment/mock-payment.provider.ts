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
}
