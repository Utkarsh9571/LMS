# Provider Abstractions Specification
## Multi-Market Custom LMS Platform

---

## 1. Adapter Pattern Directives

All external systems are decoupled behind abstract interfaces:

```text
               Application Services
                        │
    ┌───────────────────┼───────────────────┐
    ▼                   ▼                   ▼
IPaymentProvider  IStorageProvider   ILiveMeetingProvider
    ├── MockPayment     ├── LocalMock        ├── MockMeeting
    └── HitPay          ├── S3               └── Zoom
                        └── Cloudinary
```

---

## 2. Core Interfaces

### A. `IPaymentProvider` (Updated with PaymentAttempt & Webhook Idempotency Support)
```typescript
export interface CreateCheckoutSessionParams {
  orderId: string;
  orderNumber: string;
  paymentAttemptId: string;
  amountMinorUnits: number;          // Integer minor units
  currency: string;                  // 'SGD' | 'MYR'
  customer: { name: string; email: string; phone?: string };
  description: string;
  returnUrl: string;
  webhookUrl: string;
  marketCode: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  externalReference: string;
  redirectUrl: string;               // Gateway URL or Mock simulation page
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

export interface IPaymentProvider {
  readonly providerName: string;
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult>;
  verifyWebhook(headers: Record<string, string>, rawBody: string, secretSalt: string): Promise<WebhookVerificationResult>;
}
```

### B. `IStorageProvider`
```typescript
export interface IStorageProvider {
  getSignedUploadUrl(key: string, mimeType: string): Promise<{ uploadUrl: string; fileUrl: string }>;
  getReadUrl(key: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
}
```

### C. `ILiveMeetingProvider`
```typescript
export interface ILiveMeetingProvider {
  createMeeting(params: CreateMeetingParams): Promise<{
    meetingId: string;
    hostUrl: string;
    studentJoinUrl: string;
  }>;
}
```
