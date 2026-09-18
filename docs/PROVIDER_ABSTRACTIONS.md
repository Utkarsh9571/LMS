# Provider Abstractions Specification — Phase 1H Production Realization
## Multi-Market Custom LMS Platform

---

## 1. Adapter Pattern Directives & Architecture

All external systems are strictly decoupled behind abstract interfaces. No domain service makes direct HTTP or API calls to external third-party services.

```text
                               Application Domain Services
                                            │
     ┌───────────────────┬──────────────────┼───────────────────┐
     ▼                   ▼                  ▼                   ▼
IPaymentProvider  IStorageProvider  ILiveMeetingProvider  INotificationProvider
     ├── MockPayment     ├── MockStorage    ├── MockMeeting       ├── MockNotification
     └── HitPay          └── S3Storage      └── ZoomMeeting       └── ResendNotification
```

---

## 2. Core Interfaces & Production Adapters

### A. Storage Provider (`IStorageProvider`)
- **Implementations**: `MockStorageProvider`, `S3StorageProvider` (`src/providers/storage/s3-storage.provider.ts`)
- **Factory**: `StorageProviderFactory` (`src/providers/storage/storage-provider.factory.ts`)
- **Target Compatibility**: AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO.
- **Provider Responsibilities (`S3StorageProvider`)**:
  - Generates AWS SigV4 signed upload (`PUT`) and read (`GET`) URLs.
  - Supports S3-compatible endpoints, buckets, regions, and path-style options.
  - Controls signed URL expiry parameters (e.g. 15-minute upload, 1-hour read).
- **Domain Responsibilities (`AssignmentService`)**:
  - Generates unguessable server-owned assignment storage keys (`uploads/{userId}/{assignmentId}/{uuid}.ext`).
  - Validates key ownership and prefix constraints before issuing upload URLs or accepting submissions.
  - (Note: The `S3StorageProvider` adapter handles pure binary presigning/deletion; key structure & ownership rules are strictly enforced by the domain layer).

### B. Live Meeting Provider (`ILiveMeetingProvider`)
- **Implementations**: `MockMeetingProvider`, `ZoomMeetingProvider` (`src/providers/meeting/zoom-meeting.provider.ts`)
- **Factory**: `MeetingProviderFactory` (`src/providers/meeting/meeting-provider.factory.ts`)
- **Target Protocol**: Zoom Server-to-Server OAuth (`ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`).
- **Security & Idempotency Invariants**:
  - In-memory OAuth token caching prior to expiration.
  - Host URLs (`start_url`) strictly protected and stripped from student-facing DTOs (`toSafeDTO(false)`).
  - Idempotent session scheduling: `LiveSessionService` checks for existing sessions by `idempotencyKey` or `{ batchId, title, startTime }` before calling Zoom API, preventing duplicate meeting creation on retries.

### C. Notification Provider (`INotificationProvider`)
- **Implementations**: `MockNotificationProvider`, `ResendNotificationProvider` (`src/providers/notification/resend-notification.provider.ts`)
- **Factory**: `NotificationProviderFactory` (`src/providers/notification/notification-provider.factory.ts`)
- **Domain Service**: `NotificationService` (`src/core/services/notification.service.ts`)
- **Supported Templates**: Welcome Email, Payment Receipt, Live Session Notice, Certificate Issuance Notice.
- **Strict Configuration**:
  - `ResendNotificationProvider` (`providerName = 'resend'`) requires `EMAIL_FROM` and `EMAIL_API_KEY`. Missing `EMAIL_API_KEY` in production throws `ApplicationError` (never silently logs or returns fake success).
- **Transactional Invariants**:
  - Dispatched post-commit out-of-band; email failures never corrupt or rollback MongoDB transactions.

### D. Payment Provider (`IPaymentProvider`)
- **Implementations**: `MockPaymentProvider`, `HitPayProvider` (`src/providers/payment/hitpay.provider.ts`)
- **Factory**: `PaymentProviderFactory` (`src/providers/payment/payment-provider.factory.ts`)
- **Market Credentials**: `HITPAY_SG_API_KEY` / `HITPAY_SG_SALT` for SG market; `HITPAY_MY_API_KEY` / `HITPAY_MY_SALT` for MY market.
- **Security Invariants**:
  - Timing-safe HMAC SHA-256 webhook signature verification (`crypto.timingSafeEqual`).
  - Integer minor-unit money arithmetic (`parseDecimalToMinorUnits`).
  - Strict market context resolution via `OrderModel` -> `MarketModel`.

---

## 3. Operational Selection & Provider Factory Invariants

- Factories (`StorageProviderFactory`, `MeetingProviderFactory`, `NotificationProviderFactory`, `PaymentProviderFactory`) strictly evaluate provider selection:
  1. Explicit mock request or `useMock* = true` (default in dev/tests) ➔ returns Mock provider.
  2. Explicit production request (`'s3'`, `'zoom'`, `'resend'`, `'hitpay'`) ➔ returns production provider or throws `ApplicationError` if required credentials are missing.
  3. Unknown/unsupported provider name ➔ throws `ApplicationError`. **Factories never silently fall back to mock providers for unsupported production configurations.**

---

## 4. Implementation Readiness Status

| Provider | Production Adapter | Status |
|---|---|:---:|
| **Storage** | `S3StorageProvider` (SigV4, S3/R2/MinIO) | Implemented, Unit-Tested, Live Integration Pending |
| **Meeting** | `ZoomMeetingProvider` (Zoom S2S OAuth) | Implemented, Unit-Tested, Live Integration Pending |
| **Notification** | `ResendNotificationProvider` (Resend REST API) | Implemented, Unit-Tested, Live Integration Pending |
| **Payment** | `HitPayProvider` (HitPay SG & MY) | Implemented, Unit-Tested, Live Integration Pending |
