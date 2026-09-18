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
     └── HitPay          └── S3Storage      └── ZoomMeeting       └── EmailNotification
```

---

## 2. Core Interfaces & Production Adapters

### A. Storage Provider (`IStorageProvider`)
- **Implementations**: `MockStorageProvider`, `S3StorageProvider` (`src/providers/storage/s3-storage.provider.ts`)
- **Factory**: `StorageProviderFactory` (`src/providers/storage/storage-provider.factory.ts`)
- **Target Compatibility**: AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO.
- **Security Invariants**:
  - AWS SigV4 signed upload (`PUT`) and read (`GET`) URLs.
  - Short-lived expiration windows (15 min upload, 1 hour read).
  - Keys generated server-side strictly under `uploads/{userId}/{assignmentId}/` prefixes.
  - Credentials sourced strictly from environment variables (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_REGION`, `S3_ENDPOINT`).

### B. Live Meeting Provider (`ILiveMeetingProvider`)
- **Implementations**: `MockMeetingProvider`, `ZoomMeetingProvider` (`src/providers/meeting/zoom-meeting.provider.ts`)
- **Factory**: `MeetingProviderFactory` (`src/providers/meeting/meeting-provider.factory.ts`)
- **Target Protocol**: Zoom Server-to-Server OAuth (`ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`).
- **Security Invariants**:
  - In-memory OAuth token caching prior to expiration.
  - Host URLs (`start_url`) strictly protected and stripped from student-facing DTOs (`toSafeDTO(false)`).
  - `providerMeetingId` ensures idempotent session scheduling.

### C. Notification Provider (`INotificationProvider`)
- **Implementations**: `MockNotificationProvider`, `EmailNotificationProvider` (`src/providers/notification/email-notification.provider.ts`)
- **Factory**: `NotificationProviderFactory` (`src/providers/notification/notification-provider.factory.ts`)
- **Domain Service**: `NotificationService` (`src/core/services/notification.service.ts`)
- **Supported Templates**: Welcome Email, Payment Receipt, Live Session Notice, Certificate Issuance Notice.
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

## 3. Operational Selection & Environment Toggles

Provider selection is strictly configuration-driven:
- `USE_MOCK_PAYMENT=true` / `USE_MOCK_MEETING=true` / `USE_MOCK_STORAGE=true` / `USE_MOCK_NOTIFICATION=true` default to `true` in local development and automated tests.
- When mock mode is disabled in production (`NODE_ENV=production`), factories mandate presence of valid provider environment variables or fail fast with descriptive non-leaking errors.
