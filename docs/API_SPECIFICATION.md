# API Specification (REST)
## Multi-Market Custom LMS Platform

---

## 1. Market-Aware Request Context

- In **Production**, the `Host` header strictly resolves the market (`sg.domain.com` -> `SG`).
- In **Development**, clients can pass `?market=SG` or `x-market-override: SG`.
- Downstream handlers receive `request.headers.get('x-resolved-market')`.

---

## 2. Payment & Checkout Endpoints (Retries Supported)

### A. Checkout & Payment Initiation
- `POST /api/v1/store/checkout`
  - **Payload:** `{ productId: string, couponCode?: string, billingDetails: {...} }`
  - **Action:** Creates an `Order` in `pending_payment` status and initial `PaymentAttempt #1`. Calls `IPaymentProvider.createCheckoutSession(...)`.
  - **Response:** `{ orderNumber: string, paymentAttemptId: string, checkoutUrl: string }`

### B. Payment Retry
- `POST /api/v1/orders/:orderNumber/retry-payment`
  - **Action:** If the `Order` is still in `pending_payment`, marks previous abandoned/failed attempts and spawns `PaymentAttempt #N`. Calls `IPaymentProvider.createCheckoutSession(...)`.
  - **Response:** `{ paymentAttemptId: string, checkoutUrl: string }`

---

## 3. Webhook Contracts & Idempotency Flow

### `POST /api/webhooks/payments/hitpay`
1. **Raw Body Ingest:** Reads raw request buffer for HMAC signature verification.
2. **Reference Resolution:** Extracts HitPay payment reference ID.
3. **Idempotency Gate:** Checks `payment_webhook_events`. If event is already `processed`, returns HTTP `200 OK` immediately.
4. **Signature Verification:** Computes HMAC-SHA256 using `process.env[market.paymentConfigurationRef + '_SALT']`.
5. **Amount/Currency Integrity Check:**
   - Asserts `receivedCurrency === order.currency`
   - Asserts `receivedAmountMinorUnits === order.totalMinorUnits`
   - If mismatch: Updates attempt to `amount_mismatch`, alerts admin, rejects fulfillment.
6. **Transactional Fulfillment:**
   - Marks `PaymentAttempt` -> `succeeded`
   - Marks `Order` -> `paid`
   - Grants Entitlements for all `ProductDeliverable` items.
   - Atomically claims Batch seat if deliverable is a Batch.
   - Marks `payment_webhook_events` -> `processed`.

### `POST /api/webhooks/payments/mock`
- Dev/testing endpoint enabling one-click local payment simulation (succeed, fail, retry, and amount mismatch).
