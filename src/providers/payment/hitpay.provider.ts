import crypto from 'node:crypto';
import {
  IPaymentProvider,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  WebhookVerificationResult
} from './payment-provider.interface';
import { logger } from '@/lib/logger';
import { PaymentProviderError } from '@/lib/errors';

/**
 * HitPay Payment Gateway Adapter Boundary
 * 
 * Strict invariants:
 * - NO credentials in MongoDB or code
 * - Sandbox/default safe behavior without live activation
 * - Raw request body HMAC-SHA256 signature verification using crypto.timingSafeEqual
 * - Secrets read exclusively from runtime process.env
 * - Redacts all secrets from logs
 */
export class HitPayProvider implements IPaymentProvider {
  public readonly providerName = 'hitpay';

  private readonly sandboxApiBase = 'https://api.sandbox.hit-pay.com/v1';
  private readonly productionApiBase = 'https://api.hit-pay.com/v1';

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
    secretApiKey?: string
  ): Promise<CheckoutSessionResult> {
    const isSandbox = process.env.NODE_ENV !== 'production' || process.env.HITPAY_ENVIRONMENT === 'sandbox';
    const baseUrl = isSandbox ? this.sandboxApiBase : this.productionApiBase;

    logger.info('[HitPayProvider] Preparing checkout session boundary', {
      orderNumber: params.orderNumber,
      amountMinorUnits: params.amountMinorUnits,
      currency: params.currency,
      marketCode: params.marketCode,
      isSandbox,
      hasApiKey: Boolean(secretApiKey)
    });

    // If API key is not configured or live processing is deferred in Phase 1E:
    // Generate a safe sandbox boundary payment request reference.
    if (!secretApiKey || secretApiKey.trim() === '') {
      const externalReference = `hitpay_sandbox_ref_${params.paymentAttemptId}`;
      const sessionId = `hitpay_sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const redirectUrl = `${baseUrl}/payment-requests/pay/${externalReference}`;

      logger.info('[HitPayProvider] Safe sandbox payment reference generated without live network call', {
        sessionId,
        externalReference
      });

      return {
        sessionId,
        externalReference,
        redirectUrl
      };
    }

    try {
      // Form-url-encoded or JSON payload per HitPay API specification
      const response = await fetch(`${baseUrl}/payment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BUSINESS-API-KEY': secretApiKey,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          amount: (params.amountMinorUnits / 100).toFixed(2),
          currency: params.currency,
          email: params.customer.email,
          name: params.customer.name,
          phone: params.customer.phone,
          reference_number: params.orderNumber,
          redirect_url: params.returnUrl,
          webhook: params.webhookUrl,
          purpose: params.description,
          payment_methods: params.paymentMethods
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[HitPayProvider] Gateway payment request failed', {
          status: response.status,
          statusText: response.statusText
        });
        throw new PaymentProviderError(`HitPay API returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        sessionId: data.id || data.reference_number || `hitpay_sess_${Date.now()}`,
        externalReference: data.id || data.reference_number,
        redirectUrl: data.url
      };
    } catch (err: any) {
      if (err instanceof PaymentProviderError) throw err;
      logger.error('[HitPayProvider] Network error communicating with HitPay', { message: err.message });
      throw new PaymentProviderError(`Failed to initiate HitPay checkout: ${err.message}`);
    }
  }

  /**
   * Cryptographically verifies HitPay HMAC-SHA256 signature against the raw body buffer.
   * Uses crypto.timingSafeEqual to prevent timing attacks.
   */
  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: string,
    secretSalt: string
  ): Promise<WebhookVerificationResult> {
    if (!secretSalt || secretSalt.trim() === '') {
      logger.error('[HitPayProvider] Secret salt is missing for webhook verification');
      return {
        isValid: false,
        eventId: `hitpay_err_nosalt_${Date.now()}`,
        externalReference: '',
        status: 'failed',
        amountMinorUnits: 0,
        currency: '',
        rawPayload: {}
      };
    }

    // HitPay signature header can be 'hitpay-signature' or 'x-hitpay-signature'
    const signatureHeader =
      headers['hitpay-signature'] ||
      headers['x-hitpay-signature'] ||
      headers['Hitpay-Signature'] ||
      '';

    if (!signatureHeader) {
      logger.warn('[HitPayProvider] Missing HitPay signature header');
      return {
        isValid: false,
        eventId: `hitpay_err_nosig_${Date.now()}`,
        externalReference: '',
        status: 'failed',
        amountMinorUnits: 0,
        currency: '',
        rawPayload: {}
      };
    }

    // Parse payload (either URL-encoded or JSON)
    let parsed: Record<string, any> = {};
    try {
      if (rawBody.trim().startsWith('{')) {
        parsed = JSON.parse(rawBody);
      } else {
        const params = new URLSearchParams(rawBody);
        parsed = Object.fromEntries(params.entries());
      }
    } catch (err) {
      logger.error('[HitPayProvider] Failed to parse webhook body', { err });
      return {
        isValid: false,
        eventId: `hitpay_err_parse_${Date.now()}`,
        externalReference: '',
        status: 'failed',
        amountMinorUnits: 0,
        currency: '',
        rawPayload: {}
      };
    }

    // Compute expected HMAC-SHA256 signature
    // HitPay calculates HMAC-SHA256 over raw payload or sorted parameter values
    // Using raw body buffer HMAC standard as specified in COMMERCE.md
    let isValid = false;
    try {
      const computedHmac = crypto
        .createHmac('sha256', secretSalt)
        .update(rawBody, 'utf8')
        .digest('hex');

      const expectedBuffer = Buffer.from(computedHmac, 'utf8');
      const receivedBuffer = Buffer.from(signatureHeader, 'utf8');

      if (expectedBuffer.length === receivedBuffer.length) {
        isValid = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
      } else {
        isValid = false;
      }
    } catch (err) {
      logger.error('[HitPayProvider] Error performing HMAC verification', { err });
      isValid = false;
    }

    // Extract canonical fields from webhook payload
    const eventId = String(parsed.payment_id || parsed.id || parsed.eventId || `hitpay_evt_${Date.now()}`);
    const externalReference = String(
      parsed.payment_request_id || parsed.reference_number || parsed.externalReference || ''
    );
    const rawStatus = String(parsed.status || '').toLowerCase();
    const status: 'succeeded' | 'failed' | 'pending' =
      rawStatus === 'completed' || rawStatus === 'succeeded'
        ? 'succeeded'
        : rawStatus === 'pending'
          ? 'pending'
          : 'failed';

    // Amount minor units handling: HitPay sends decimal strings (e.g. "999.00" or 999) or integer minor units
    let amountMinorUnits = 0;
    if (typeof parsed.amountMinorUnits === 'number') {
      amountMinorUnits = Math.round(parsed.amountMinorUnits);
    } else if (parsed.amount !== undefined) {
      const floatVal = parseFloat(String(parsed.amount));
      if (!isNaN(floatVal)) {
        amountMinorUnits = Math.round(floatVal * 100);
      }
    }

    const currency = String(parsed.currency || '').toUpperCase();
    const paymentMethod = String(parsed.payment_type || parsed.paymentMethod || 'hitpay');

    return {
      isValid,
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
