# Multi-Market Custom LMS Platform

A high-performance, modular monolithic Learning Management System (LMS) custom-built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **MongoDB / Mongoose**.

Engineered from first principles to support multi-market operations (**Singapore (SG)** and **Malaysia (MY)**) with domain-authoritative market resolution, canonical educational assets, flexible access entitlements, and drip-scheduled student learning.

---

## 🏗️ Architecture & Core Invariants

```text
   Commercial Layer (Phase 1E)      Product ── 1:N ── Deliverable ── Offer (SGD/MYR)
                                                       │
   Entitlement Engine (Phase 1D)                       ▼
                                                  Entitlement (Course / Batch Access Grant)
                                                       │
   Academic Engine (Phase 1C & 1D)                     ▼
                                                   Enrollment (userId, courseId, batchId)
                                                       │
                                   ┌───────────────────┴───────────────────┐
                                   ▼                                       ▼
                             Course Access                            Lesson Access
                      (Self-Paced / Cohort-Batch)           (Drip Schedule & Preview Evaluator)
                                                                           │
                                                                           ▼
                                                                     Lesson Progress
                                                              (Seconds, Status & Completion)
```

1. **Zero Commercial Coupling in Courses:** Course curriculum models are canonical and globally unique educational assets. They contain zero price, currency, market code, or payment provider logic.
2. **Generic Access Grants (Entitlements):** Access is mediated by `Entitlement` records (`targetType: 'course' | 'batch'`). The system supports lifetime access (`expiresAt: null`) or term-based grants with audited expiration checks.
3. **Multi-Market Domain Authority:** Market context is resolved strictly via hostname in production (`sg.bimacademy.com` ➔ `SG`, `my.bimacademy.com` ➔ `MY`). Query parameters and spoofed client headers are rejected.
4. **Deterministic Drip Schedule:** Lessons unlock based on student enrollment date:
   $$\text{effectiveDripDays} = \text{lesson.unlockOverrideDays} \mathbin{??} \text{module.dripDaysAfterEnrollment} \mathbin{??} 0$$
   $$\text{unlockTime} = \text{enrollment.enrolledAt} + \text{effectiveDripDays} \times 86{,}400{,}000\text{ ms}$$
5. **Content Protection & Privacy Boundary:** Non-preview curriculum metadata never leaks private `contentData` (video storage keys, PDF keys, markdown body) or private resources to unentitled or locked users.

---

## 🚀 Implementation Status (Phases)

| Phase | Description | Status | Verification |
|---|---|:---:|---|
| **Phase 1A** | Platform Foundation & Config | ✅ Complete | Next.js App Router, DB connector, logger, errors, mock adapters |
| **Phase 1B** | Identity + Market Context + RBAC | ✅ Complete | Password hashing (bcryptjs), JWT sessions (jose), RBAC capability matrix |
| **Phase 1C** | Canonical LMS / Course Engine | ✅ Complete | Course, Module, Lesson models, reordering, curriculum tree |
| **Phase 1D** | Student Learning + Access | ✅ Complete & Audited | Entitlements, Enrollments, Drip Unlocking, Progress, Student APIs |
| **Phase 1E** | Commerce, Orders & Payments | ✅ Complete & Audited | Products, Offers, Orders, PaymentAttempt retry model, HitPay/Mock, Fulfillment |
| **Phase 1F** | Batch Engine & Cohorts | ✅ Complete & Audited | Atomic capacity claims, Live sessions, Attendance, MockMeetingProvider |
| **Phase 1G** | Assessments & Certificates | ⏳ Not Started | Quizzes, assignments, dynamic PDF certificates *(Next phase)* |

---

## 📡 Batch & Live Delivery API (Phase 1F)

The cohort engine delivers live instructor-led learning on top of canonical courses, featuring atomic capacity allocation, meeting provider abstraction, and idempotent attendance tracking.

| Method | Endpoint | Description | Auth / Access Requirement |
|---|---|---|---|
| `GET` | `/api/v1/batches` | Lists operational cohorts filtered by course, market, and assigned instructor | Public / Auth Context |
| `POST` | `/api/v1/batches` | Creates new Batch with defined capacity and enrollment windows | Admin / Superadmin (`batches:write`) |
| `GET` | `/api/v1/batches/:id` | Returns batch metadata, schedule, and capacity metrics | Admin / Assigned Instructor |
| `PATCH` | `/api/v1/batches/:id` | Updates batch status, timeline, instructor, or capacity | Admin / Superadmin (`batches:write`) |
| `GET` | `/api/v1/batches/:id/roster` | Displays student cohort roster with live progress and attendance rates | Admin / Assigned Instructor |
| `POST` | `/api/v1/batches/:id/sessions` | Schedules a live video class via `ILiveMeetingProvider` (allocates host & join URLs) | Admin / Assigned Instructor |
| `GET` | `/api/v1/batches/:id/sessions` | Lists scheduled/completed sessions (`hostUrl` stripped for students) | Enrolled Student / Instructor |
| `GET` | `/api/v1/sessions/:id` | Returns live session details and recording URLs | Admin / Assigned Instructor / Student |
| `PATCH` | `/api/v1/sessions/:id` | Updates session status, schedule, or recording URLs | Admin / Assigned Instructor |
| `GET` | `/api/v1/sessions/:id/attendance` | Returns attendance ledger for a live class | Admin / Assigned Instructor |
| `PATCH` | `/api/v1/sessions/:id/attendance/:userId` | Updates student attendance status (`present`, `late`, `absent`, `excused`) | Admin / Assigned Instructor |
| `GET` | `/api/v1/student/batches` | Lists all active cohort batches the student is enrolled in with live session countdowns | Authenticated Student |
| `GET` | `/api/v1/student/batches/:id` | Detailed cohort syllabus, instructor profile, and session schedule | Active Cohort Enrollment |
| `POST` | `/api/v1/student/sessions/:id/join` | Idempotently logs attendance on join click and returns `studentJoinUrl` | Active Cohort Enrollment |

---

## 📡 Commerce & Payments API (Phase 1E)

The commercial engine decouples commercial products and market offers from canonical courses, using integer minor units (`SGD`/`MYR`), idempotent webhook processing, and multi-deliverable fulfillment.

| Method | Endpoint | Description | Auth / Access Requirement |
|---|---|---|---|
| `POST` | `/api/v1/store/checkout` | Creates Order with frozen integer pricing snapshot, spawns PaymentAttempt #1, calls payment gateway | Authenticated Student |
| `POST` | `/api/v1/orders/:orderNumber/retry-payment` | Spawns PaymentAttempt #N on an existing pending order without creating duplicate orders | Authenticated Student (Order Owner) |
| `POST` | `/api/webhooks/payments/hitpay` | Ingests HitPay webhook raw body buffer, cryptographically verifies HMAC-SHA256 with market secret, fulfills order | Public / Payment Gateway (HMAC Signed) |
| `POST` | `/api/webhooks/payments/mock` | Local development and testing webhook simulator exercising full fulfillment pipeline | Dev/Test Only (Disabled in Production) |

---

## 📡 Student Learning API (Phase 1D)

All student endpoints require an authenticated student session (`requireAuth()`). Student identity is derived exclusively from the session token; client-supplied `userId` parameters are strictly ignored.

| Method | Endpoint | Description | Auth / Access Requirement |
|---|---|---|---|
| `GET` | `/api/v1/student/enrollments` | Lists all active course enrollments with progress percentage | Authenticated Student |
| `GET` | `/api/v1/student/courses/:courseId/learn` | Student curriculum tree with lesson unlock countdowns & progress states | Active Course Enrollment |
| `GET` | `/api/v1/student/courses/:courseId/lessons/:lessonId` | Full protected lesson content (video storage keys, body markdown, resources) | Active Entitlement + Drip Unlocked (or Free Preview) |
| `POST` | `/api/v1/student/lessons/:lessonId/progress` | Records seconds watched and marks lesson completion (Canonical route) | Active Course Enrollment + Lesson Access |
| `POST` | `/api/v1/student/courses/:courseId/lessons/:lessonId/progress` | Records lesson progress and recalculates course progress percentage | Active Course Enrollment + Lesson Access |

---

## 🛠️ Development & Testing

### Environment Setup
Create `.env.local` with required configuration:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/lms
SESSION_SECRET=your_super_secret_jwt_signing_key_at_least_32_characters_long

# Provider Modes
USE_MOCK_PAYMENT=true
USE_MOCK_MEETING=true

# HitPay Market Credentials (Resolved by config reference without DB storage)
# In production, set actual keys and secrets in environment variables
HITPAY_SG_API_KEY=
HITPAY_SG_SALT=
HITPAY_MY_API_KEY=
HITPAY_MY_SALT=
```

### Mock Payment Testing
In local development (`USE_MOCK_PAYMENT=true`):
1. Checkout requests return deterministic mock session URLs (`/mock-checkout?...`).
2. Gateway callbacks can be simulated by calling `POST /api/webhooks/payments/mock` with JSON:
   ```json
   {
     "eventId": "mock_evt_101",
     "externalReference": "mock_ref_<paymentAttemptId>",
     "status": "succeeded",
     "amountMinorUnits": 99900,
     "currency": "SGD"
   }
   ```
3. The mock webhook routes directly into `PaymentFulfillmentService` to grant entitlements and provision enrollments.

### MongoDB Transactions & Fulfillment Boundary
- **Transaction-Aware Fulfillment Pipeline:**
  In a MongoDB replica set deployment, `PaymentFulfillmentService` executes order paid status update, payment attempt success transition, entitlement grants, and course enrollment provisioning within a single atomic multi-document transaction (`ClientSession.withTransaction`).
- **Session Propagation:**
  `EntitlementService.grantEntitlement` and `EnrollmentService.createEnrollmentFromEntitlement` accept an optional `ClientSession` parameter. All reads and mutations inside the fulfillment loop participate in this single session.
- **Fail-Safe Rollback (No Swallowed Errors):**
  If course enrollment fails (e.g. database error, missing course, unique constraint violation), the error is not swallowed—it immediately aborts and rolls back the transaction. Paid order state and payment attempt success are completely rolled back to prevent inconsistent states.
- **Standalone MongoDB Limitation:**
  In local development environments running standalone single-node MongoDB (default instances without `--replSet`), MongoDB transactions throw error code 20 (`IllegalOperation`). The service detects this topology, falls back to sequential execution with an explicit warning, and logs the limitation. Sequential execution in standalone MongoDB is **not** transactionally atomic.
- **Phase 1F Boundary Preserved:**
  For deliverable type `'batch'`, generic batch entitlements are granted. Cohort assignments, batch capacity tracking (`enrolledCount`), instructor scheduling, and live meeting integrations are strictly deferred to Phase 1F.

### Available Scripts
```bash
# Start Next.js development server
npm run dev

# Run complete automated verification test suite (Phase 1B, 1C, 1D, 1E)
npm test

# Run TypeScript type safety checks (strict mode)
npm run typecheck

# Run ESLint validation
npm run lint

# Build production bundle
npm run build
```


---

## 📚 Documentation Reference
- [`docs/PRD.md`](./docs/PRD.md) — Product requirements and business objectives.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — System topology and architectural patterns.
- [`docs/DOMAIN_MODEL.md`](./docs/DOMAIN_MODEL.md) — Domain entities and relationship invariants.
- [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) — Database schema, collections, and index specifications.
- [`docs/ENROLLMENT_AND_ACCESS.md`](./docs/ENROLLMENT_AND_ACCESS.md) — Entitlement fulfillment and content unlock algorithm.
- [`docs/COURSE_ENGINE.md`](./docs/COURSE_ENGINE.md) — Canonical course hierarchy and deterministic drip rules.
- [`docs/RBAC.md`](./docs/RBAC.md) — Role-based access control and capability matrix.
- [`docs/API_SPECIFICATION.md`](./docs/API_SPECIFICATION.md) — RESTful API contract.
- [`docs/IMPLEMENTATION_NOTES.md`](./docs/IMPLEMENTATION_NOTES.md) — Engineering decision records and audit notes.
