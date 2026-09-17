# System Architecture Specification
## Multi-Market Custom LMS Platform

---

## 1. High-Level Architecture & Global Topology

The platform is structured as a **Modular Monolith** using Next.js (App Router), React, TypeScript, and MongoDB with Mongoose. It avoids distributed microservices and premature queue broker infrastructure while maintaining strict separation of concerns through internal domain boundaries.

```text
                                 ECOSYSTEM BOUNDARY
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
┌──────────────────────────────┐                       ┌──────────────────────────────────────┐
│       INDIA ECOSYSTEM        │                       │       CUSTOM MULTI-MARKET LMS        │
│         (Standalone)         │                       │        (Singapore & Malaysia)        │
│                              │                       │                                      │
│  Platform:  TagMango         │                       │  Architecture: Modular Monolith      │
│  Payments:  Razorpay         │                       │  Stack:        Next.js / TS / Mongo  │
│  Currency:  INR              │                       │  Markets:      SG (SGD) & MY (MYR)   │
│                              │                       │  Payments:     HitPay & Mock Gateway │
│  (No V1 sync, no API bridge) │                       │                                      │
└──────────────────────────────┘                       └──────────────────┬───────────────────┘
                                                                          │
                                                                          ▼
                                                         Canonical Course Catalog (Shared)
```

---

## 2. Multi-Market Architecture & Resolution Flow

```text
                        INCOMING HTTP REQUEST
                                  │
                                  ▼
                Next.js Edge Middleware (marketContext)
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        ▼                                                   ▼
[Production Mode (NODE_ENV=production)]       [Development Mode (NODE_ENV=development)]
        │                                                   │
Extract Hostname (e.g. sg.domain.com)        Check Query Param: ?market=SG|MY
Lookup Market where domains contains host    OR Check Dev Cookie: dev_market_override
Strict: URL overrides FORBIDDEN              OR Fallback to Hostname
        │                                                   │
        └─────────────────────────┬─────────────────────────┘
                                  ▼
                        Resolved Market Context
                   { code: 'SG' | 'MY', currency: 'SGD' | 'MYR', ... }
                                  │
                 Attached to Request Headers & React Context
```

### Production vs. Development Resolution Rules
- **Production:** The domain/host header is **authoritative**. A user on `sg.bimacademy.com` is locked to market `SG`. Any query parameters like `?market=MY` or spoofed client headers are ignored or rejected.
- **Local Development / Staging:** When `NODE_ENV !== 'production'`, developers and testers can seamlessly switch markets on `localhost:3000` via:
  1. URL Query parameter: `http://localhost:3000/courses?market=MY`
  2. UI Dev Switcher dropdown (persisting to a cookie `x-dev-market-override`)
  3. Default fallback to `SG`.

---

## 3. Shared Course vs. Commercial Market Separation

```text
                                 SHARED LMS CORE
                                        │
                                      Course
                            (Revit Architecture 2026)
                         [Canonical Educational Content]
                          (No price, no currency, no market)
                                        │
                ┌───────────────────────┴───────────────────────┐
                ▼                                               ▼
         Singapore Product                               Malaysia Product
        (ProductDeliverables:                           (ProductDeliverables:
         - Course: Revit 2026)                           - Course: Revit 2026)
                │                                               │
                ▼                                               ▼
         Singapore Offer                                 Malaysia Offer
        (Currency: SGD,                                 (Currency: MYR,
         Price: 99900 cents)                             Price: 299900 sen)
                │                                               │
                ▼                                               ▼
         HitPay SG Provider                              HitPay MY Provider
     (CredRef: HITPAY_SG_SALT)                       (CredRef: HITPAY_MY_SALT)
                │                                               │
                └───────────────────────┬───────────────────────┘
                                        ▼
                                   Order (OrderNumber, Market, TotalMinorUnits)
                                        │
                                     Payment (Provider, Status: Succeeded)
                                        │
                                   Entitlement (targetType: 'course', targetId: Revit2026)
                                        │
                                   Enrollment (userId, courseId, progressId)
                                        │
                                  Content Access (Unlocked)
```

---

## 4. Payment Secret & Credential Storage Architecture

To preserve strict security compliance and avoid secret leakage:
1. **Zero Database Secrets:** MongoDB stores **zero** API keys, passwords, webhook signing secrets, or private merchant salts.
2. **Credential Reference Indirection:**
   - The `Market` document contains a `paymentConfigurationRef` string (e.g., `HITPAY_SG`, `HITPAY_MY`).
   - The runtime `PaymentProviderFactory` reads the reference and resolves the actual secrets from process environment variables:
     - `HITPAY_SG` $\rightarrow$ `process.env.HITPAY_SG_API_KEY`, `process.env.HITPAY_SG_SALT`
     - `HITPAY_MY` $\rightarrow$ `process.env.HITPAY_MY_API_KEY`, `process.env.HITPAY_MY_SALT`
3. **Mock Fallback:** If `USE_MOCK_PAYMENT=true` or if credentials are unconfigured during development, `PaymentProviderFactory` automatically provisions `MockPaymentProvider`.

---

## 5. Directory Structure & Module Boundaries

```text
c:\Users\danish\Desktop\lms/
├── docs/                           # Architectural, domain, and API specifications
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Login, Register, Forgot Password
│   │   ├── (marketing)/            # Public Catalog, Course Landing, Checkout
│   │   ├── (student)/              # Student Dashboard, Course Player, Batch Room
│   │   ├── (instructor)/           # Cohort Management, Live Sessions, Grading Queue
│   │   ├── (admin)/                # Curriculum Builder, Offers, Batches, Orders
│   │   └── api/                    # REST endpoints & Webhooks
│   │       ├── webhooks/
│   │       │   └── payments/       # HitPay & Mock payment webhooks
│   │       └── v1/                 # Resource APIs
│   ├── core/                       # Pure Domain Logic & Services
│   │   ├── domain/                 # Domain models, Mongoose schemas, interfaces
│   │   └── services/               # Orchestrators (OrderService, EntitlementService, etc.)
│   ├── providers/                  # Decoupled External Adapters
│   │   ├── payment/                # IPaymentProvider, HitPayProvider, MockPaymentProvider
│   │   ├── storage/                # IStorageProvider, S3Provider, LocalMockStorageProvider
│   │   ├── meeting/                # ILiveMeetingProvider, ZoomProvider, MockMeetingProvider
│   │   └── notification/           # INotificationProvider, EmailProvider, MockProvider
│   ├── lib/                        # Cross-cutting utilities (DB connection, JWT, Logger)
│   └── middleware.ts               # Market resolution & route protection middleware
```

---

## 6. Future India / TagMango Integration Boundary

While strictly excluded from V1 execution, the architecture provides integration readiness:
- **Canonical ID Compatibility:** Course slugs and Lesson identifiers follow RFC-3986 standards, making them compatible as external references if TagMango course completion webhooks are ingested later.
- **External Order Attribution:** The `Order` and `Entitlement` schemas support an optional `externalSystemRef` field (`tagmango_india`), ensuring that if historical student records are synced in Phase 4, they fit directly into the `Entitlement` and `Enrollment` tables.
