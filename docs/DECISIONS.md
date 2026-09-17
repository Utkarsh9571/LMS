# Architecture Decision Records (ADR)
## Multi-Market Custom LMS Platform

---

## ADR-001: Separation of Product, Deliverable, Course, and Entitlement
- **Context:** TagMango and traditional LMS platforms bind payments directly to courses. This breaks when selling cohort seats, bundles, or multi-course deliverables.
- **Decision:** Separate `Product` from `ProductDeliverable` (1:N items pointing to Course or Batch) and `Offer` (market pricing). Access is fulfilled through `Entitlement` into `Enrollment`.
- **Status:** Approved.

## ADR-002: Secure Storage of Payment Secrets
- **Context:** Payment providers require API keys and salts for each market (Singapore and Malaysia).
- **Decision:** MongoDB will **never** store raw secrets. The `Market` record references an environment variable pointer (`paymentConfigurationRef: "HITPAY_SG"`). Actual secrets are pulled from `process.env` at runtime.
- **Status:** Approved.

## ADR-003: Authoritative Production Market Resolution
- **Context:** Users must not bypass market prices or tax by tampering with query parameters in production.
- **Decision:** In production (`NODE_ENV=production`), domain/hostname is authoritative. Query parameters (`?market=MY`) and client headers are rejected. In local development (`NODE_ENV=development`), query parameters, dev cookies, and switchers are enabled for easy testing on `localhost`.
- **Status:** Approved.

## ADR-004: Exclusion of India / TagMango from V1
- **Context:** India currently runs on TagMango with Razorpay.
- **Decision:** India remains completely standalone. Zero sync, migration, or API bridges in V1. Schemas follow canonical standards so future federation is possible without restructuring.
- **Status:** Approved.

## ADR-005: Financial Math in Integer Minor Units
- **Context:** Floating-point math causes rounding inaccuracies in accounting.
- **Decision:** All prices, discounts, and order totals are stored and manipulated strictly in integer minor units (e.g., cents, sen). Mongoose models enforce `Number.isInteger` validation.
- **Status:** Approved.

## ADR-006: Order vs. PaymentAttempt Retry Architecture
- **Context:** Customers frequently fail or abandon checkout sessions before successfully completing payment. Creating a new Order for every retry clutters the database and analytics.
- **Decision:** An `Order` represents the purchase intent (1:N with `PaymentAttempt`). Retrying payment creates a new `PaymentAttempt` linked to the same `Order`. Only the successful attempt marks the order as paid.
- **Status:** Approved.

## ADR-007: Webhook Idempotency & Amount Verification
- **Context:** Gateways deliver webhook retries. Malicious or compromised requests could spoof payment confirmations.
- **Decision:** Store every incoming event in `payment_webhook_events` with a unique index on `{ provider, eventId }`. Reject duplicates idempotently. Validate received currency and minor unit amount against the server-side `Order` record before fulfilling.
- **Status:** Approved.

## ADR-008: Atomic Batch Capacity Allocation
- **Context:** High-concurrency purchases could cause a cohort batch to oversell beyond its designated capacity.
- **Decision:** Use conditional atomic update operations (`$expr: { $lt: ['$enrolledCount', '$capacity'] }`, `$inc: { enrolledCount: 1 }`) within a database transaction during fulfillment.
- **Status:** Approved.

## ADR-009: Module-Level Drip with Optional Lesson Override
- **Context:** Field duplication across Module and Lesson creates ambiguity in content unlocking.
- **Decision:** `dripDaysAfterEnrollment` lives primarily on `Module`. `Lesson` may have an optional `unlockOverrideDays` that takes precedence if non-null.
- **Status:** Approved.
