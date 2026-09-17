# Commerce & Payment Architecture
## Multi-Market Custom LMS Platform

---

## 1. Decoupled Commercial Pipeline & Multi-Deliverables

```text
Product (Revit Architecture Master Bundle)
   │
   ├── Deliverable 1: Course (Revit Architecture Core)
   ├── Deliverable 2: Course (Revit Families & Schedules)
   └── Deliverable 3: Batch  (SG Q1 Weekend Cohort)
   │
   ▼
Market Offers:
   ├── SG Offer: SGD 149900 minor units ($1,499.00)
   └── MY Offer: MYR 459900 minor units (RM 4,599.00)
   │
   ▼
Order (ORD-SG-2026-0042)
   │
   ├── PaymentAttempt 1 (Failed / Abandoned)
   ├── PaymentAttempt 2 (Failed / Timeout)
   └── PaymentAttempt 3 (Succeeded via HitPay PayNow)
   │
   ▼
Entitlement Grants (Created for all 3 Deliverables)
```

---

## 2. Order vs. PaymentAttempt Architecture (Retry Model)

An `Order` represents a customer's intent to purchase a commercial product at an agreed price. Customers frequently encounter card issues, timeouts, or abandoned QR sessions.
- An `Order` is created once when checkout begins.
- Each checkout initiation or retry generates a new `PaymentAttempt` linked to that `Order`.
- If a `PaymentAttempt` fails or expires, the customer can retry payment for the *same* `Order` without generating orphan duplicate orders.
- The first `PaymentAttempt` that succeeds marks the `Order` status as `paid` and triggers fulfillment.
- Subsequent callbacks or stale attempts are rejected idempotently.

---

## 3. Webhook Idempotency & HitPay Verification Standard

### Secure Webhook Ingest Flow
```text
POST /api/webhooks/payments/hitpay
   │
1. Receive Raw Webhook Body (Buffer)
   │
2. Extract HitPay Reference / Payment Request ID
   │
3. Check Idempotency Ledger (payment_webhook_events)
   └── If already 'processed', return HTTP 200 immediately (No duplicate fulfillment)
   │
4. Find PaymentAttempt & Associated Order via Reference
   │
5. Retrieve Market from Order -> Retrieve paymentConfigurationRef ("HITPAY_SG")
   │
6. Fetch Merchant Salt strictly from process.env (e.g. process.env.HITPAY_SG_SALT)
   │
7. Compute HMAC-SHA256 over raw body; compare with 'hitpay-signature' header
   └── If signature invalid, reject HTTP 401
   │
8. Amount & Currency Integrity Check:
   └── Compare: (receivedAmount == order.totalMinorUnits && receivedCurrency == order.currency)
   └── If mismatch: Flag security alert, mark PaymentAttempt 'amount_mismatch', reject fulfillment
   │
9. Execute Fulfillment inside MongoDB Transaction:
   ├── Mark PaymentAttempt as 'succeeded'
   ├── Mark Order as 'paid'
   ├── Grant Entitlements for all ProductDeliverables
   ├── Increment Batch enrolledCount atomically
   └── Mark payment_webhook_events as 'processed'
```

---

## 4. Integer Minor Units Standard

To prevent floating-point calculation errors:
- $1.00$ SGD = `100` minor units.
- RM $2,999.00$ MYR = `299900` minor units.
- All monetary operations (pricing, coupons, subtotals, tax, order totals) are executed exclusively using integer arithmetic (`Math.round(...)`).
