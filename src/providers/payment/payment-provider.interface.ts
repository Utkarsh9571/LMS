/**
 * Payment Provider Contract
 * Standard interface for decoupled payment gateways (HitPay, Mock, etc.)
 */

export interface CreateCheckoutSessionParams {
  orderId: string;
  orderNumber: string;
  paymentAttemptId: string;
  amountMinorUnits: number;          // Strictly validated integer minor units
  currency: string;                  // 'SGD' | 'MYR'
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  description: string;
  returnUrl: string;
  webhookUrl: string;
  marketCode: string;
  paymentMethods?: string[];
}

export interface CheckoutSessionResult {
  sessionId: string;
  externalReference: string;
  redirectUrl: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventId: string;                   // Unique provider webhook event identifier
  externalReference: string;         // Gateway reference matching payment attempt
  status: 'succeeded' | 'failed' | 'pending';
  amountMinorUnits: number;          // Integer minor units reported by gateway
  currency: string;                  // Currency reported by gateway
  paymentMethod?: string;
  rawPayload: Record<string, unknown>;
}

export interface RefundParams {
  gatewayPaymentId: string;
  amountMinorUnits: number;
  currency: string;
  reason?: string;
  idempotencyKey?: string;
}

export interface RefundProviderResult {
  success: boolean;
  status: 'succeeded' | 'failed' | 'unknown';
  gatewayRefundId?: string;
  errorMessage?: string;
  rawPayload?: Record<string, unknown>;
}

export interface IPaymentProvider {
  readonly providerName: string;
  createCheckoutSession(params: CreateCheckoutSessionParams, secretKey?: string): Promise<CheckoutSessionResult>;
  verifyWebhook(headers: Record<string, string>, rawBody: string, secretSalt: string): Promise<WebhookVerificationResult>;
  refundPayment(params: RefundParams, secretKey?: string): Promise<RefundProviderResult>;
}

