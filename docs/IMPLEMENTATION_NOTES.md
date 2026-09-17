# Implementation Notes

---

## Phase 1A Implementation Notes
- Greenfield setup using Next.js 16.x (App Router), React 19, TypeScript (strict mode), Tailwind CSS, and Mongoose.
- Centralized, typed server-side configuration layer (`src/lib/config.ts`).
- Cached MongoDB connection utility with Next.js development hot-reload awareness (`src/lib/db.ts`).
- Sanitized, structured server logger (`src/lib/logger.ts`).
- Application domain error hierarchy (`src/lib/errors.ts`) and unified API response contract (`src/lib/api-response.ts`).
- Foundational provider abstraction contracts (`IPaymentProvider`, `IStorageProvider`, `ILiveMeetingProvider`, `INotificationProvider`).
- Standalone `MockPaymentProvider` and `MockMeetingProvider` adapters requiring zero external credentials.
- Minimal development landing page and system health probe (`GET /api/health`).

---

## Phase 1B Implementation Notes (Identity + Market Context + RBAC)
1. **User Persistence & Global Identity:**
   - Mongoose `UserModel` established with unique indexed `email`, `passwordHash` (hidden with `select: false`), `fullName`, `phone`, `globalRoles`, `status`, and `lastActiveMarket`.
   - Method `user.toSafeProfile()` strips sensitive data and guarantees `passwordHash` is never serialized.
2. **Password Security:**
   - Password hashing via `bcryptjs` (salt rounds: 12).
   - Password strength validation: minimum 8 characters, uppercase, lowercase, and numeric character enforcement.
   - Email normalization (`lowercase` and `trim`) across registration and login.
   - Anti-enumeration login errors (`Invalid email or password.` for missing users and invalid hashes).
3. **Session Infrastructure:**
   - Stateless, cryptographically signed HS256 JWT sessions via `jose`.
   - Sealed in an `HttpOnly`, `SameSite=lax`, `Secure` (in production) cookie (`lms_session`).
   - Server-side access utilities: `getCurrentUser()`, `requireAuth()`, `requireRole()`, `requirePermission()`.
4. **Market Context Resolution:**
   - Production mode (`isProduction: true`): Hostname is authoritative. Query parameters (`?market=...`), client headers, and cookies are rejected. Fail-safe throws `NotFoundError` on unrecognized hostnames.
   - Development mode (`isProduction: false`): `?market=SG` and `?market=MY` query overrides, dev cookies, and subdomain prefixes enabled for developer workflow.
5. **RBAC Implementation:**
   - Strict adherence to `docs/RBAC.md`: `superadmin`, `admin`, `instructor`, `student`, `staff`.
   - Domain capability matrix in `src/core/services/rbac.service.ts` enforcing permissions (`markets:manage`, `courses:write`, `commerce:write`, `batches:write`, `sessions:host`, `assignments:grade`, `orders:write`, `content:read`, `assignments:submit`).
6. **Route Boundaries & Middleware:**
   - Edge Middleware (`src/middleware.ts`) protects `/admin/*`, `/api/admin/*`, `/instructor/*`, `/api/instructor/*`, and `/student/*`.
   - Injects resolved `x-market-code` header into incoming requests for downstream consumption.
7. **Safe Development Seeding:**
   - `src/lib/seed.ts` seeds `SG` and `MY` market records and a development administrator (`dev.admin@bimacademy.local`), guarded to forbid execution in production.
8. **Automated Verification Suite:**
   - 18 automated tests executed via `npm test` verifying password strength, hashing, session tamper-resistance, expired JWT rejection, stale JWT role checks, RBAC role/permission assertions, and production vs. development market resolution rules.

---

## Phase 1C Implementation Notes (Canonical LMS / Course Engine)
1. **Critical Architectural Invariant (Zero Commercial Logic):**
   - Verified that `CourseModel` has zero commercial or market-specific fields (no `price`, `currency`, `marketCode`, `paymentProvider`, `checkoutUrl`, `productId`, `offerId`, or `tax`).
   - Courses are authored once as canonical educational assets and shared across Singapore, Malaysia, and future markets.
2. **Canonical Domain Models:**
   - `CourseModel` (`src/core/domain/course.model.ts`): Unique slug index, title, description, level (`beginner`, `intermediate`, `advanced`, `professional`), thumbnailUrl, status (`draft`, `published`, `archived`), deliveryModes (`self_paced`, `cohort_batch`), estimatedHours, timestamps.
   - `ModuleModel` (`src/core/domain/module.model.ts`): courseId (ref: `Course`, indexed), title, description, order (compound indexed with courseId), `dripDaysAfterEnrollment` (non-negative integer, default `0`).
   - `LessonModel` (`src/core/domain/lesson.model.ts`): courseId, moduleId (indexed), title, order, contentType (`video`, `pdf`, `rich_text`, `quiz`, `assignment`), contentData (flexible typed payload), isPreviewFree (boolean), `unlockOverrideDays` (nullable non-negative integer), resources array.
3. **Deterministic Drip Schedule Resolution:**
   - Evaluated during curriculum retrieval: effective unlock delay is `lesson.unlockOverrideDays ?? module.dripDaysAfterEnrollment ?? 0`.
4. **Hierarchy & Integrity Guards:**
   - Cross-hierarchy validation enforced server-side: a lesson cannot be created or reordered under a module that belongs to a different course; module reordering verifies all module IDs belong to the specified course.
5. **Course Service & REST Endpoints:**
   - `CourseService` (`src/core/services/course.service.ts`): Course CRUD, Module creation and reordering, Lesson creation and reordering, and Curriculum tree aggregation.
   - REST Endpoints:
     - `GET /api/v1/courses`
     - `POST /api/v1/courses` (Requires `courses:write`)
     - `GET /api/v1/courses/:id`
     - `PATCH /api/v1/courses/:id` (Requires `courses:write`)
     - `GET /api/v1/courses/:id/curriculum`
     - `POST /api/v1/courses/:id/modules` (Requires `courses:write`)
     - `POST /api/v1/courses/:id/modules/reorder` (Requires `courses:write`)
     - `POST /api/v1/courses/:id/modules/:moduleId/lessons` (Requires `courses:write`)
     - `POST /api/v1/courses/:id/modules/:moduleId/lessons/reorder` (Requires `courses:write`)

---

## Phase 1D Implementation Notes (Student Learning + Access)
1. **Separation of Entitlement and Enrollment:**
   - `EntitlementModel` (`src/core/domain/entitlement.model.ts`): Generic access grant supporting `targetType: 'course' | 'batch'` with optional future targets (`workshop`, `bundle`, `membership`, `consultation`). Supports lifetime (`expiresAt: null`) or term-based access. Includes `isAccessValid(now)` check and compound index `{ userId: 1, targetType: 1, targetId: 1, status: 1 }`.
   - `EnrollmentModel` (`src/core/domain/enrollment.model.ts`): Specific student course enrollment linked to an `entitlementId`. Enforces uniqueness compound constraint `{ userId: 1, courseId: 1, batchId: 1 }`.
2. **Access Control & Content Protection:**
   - Centralized `AccessService` (`src/core/services/access.service.ts`):
     - `canAccessLesson(userId, lessonId, now)`: Evaluates preview bypass (`isPreviewFree: true` grants access immediately), active entitlement verification, active enrollment verification, and deterministic drip schedule calculation.
     - Drip unlock rule: `effectiveDripDays = lesson.unlockOverrideDays ?? module.dripDaysAfterEnrollment ?? 0`.
     - `unlockTime = enrollment.enrolledAt + effectiveDripDays * 86,400,000`. If `now < unlockTime`, returns `{ granted: false, reason: 'drip_locked', unlocksAt, daysRemaining }`.
     - `requireLessonAccess(userId, lessonId)`: Throws granular `AuthorizationError` if access is denied.
   - Content Protection Invariant: `GET /api/v1/student/courses/:courseId/learn` curriculum tree strips private `contentData` (video storage keys, pdf keys, body markdown) and private resources for drip-locked lessons to prevent sensitive storage key leakage.
3. **Student Progress & Course Completion:**
   - `LessonProgressModel` (`src/core/domain/lesson-progress.model.ts`): Unique compound constraint `{ enrollmentId: 1, lessonId: 1 }`. Tracks `status` (`not_started`, `in_progress`, `completed`), `secondsWatched`, and `isCompleted`.
   - `ProgressService` (`src/core/services/progress.service.ts`):
     - Validates lesson access and active enrollment before recording progress.
     - Recalculates total course progress percent: `Math.round((completedLessons / totalLessons) * 100)`.
     - Idempotent course completion: when progress reaches 100%, stamps `enrollment.completedAt` without overwriting existing completion timestamps or creating duplicates.
     - Division-by-zero protection for empty courses.
4. **Student REST Endpoints:**
   - `GET /api/v1/student/enrollments`: Lists authenticated student's active enrollments with course metadata.
   - `GET /api/v1/student/courses/:courseId/learn`: Returns student curriculum tree with access states and progress status.
   - `GET /api/v1/student/courses/:courseId/lessons/:lessonId`: Returns full protected lesson content after authorization.
   - `POST /api/v1/student/courses/:courseId/lessons/:lessonId/progress`: Records progress and recalculates course progress.
5. **Mass-Assignment & Security Guards:**
   - Student endpoints derive `userId` strictly from the cryptographically verified session token (`requireAuth()`). Client-supplied `userId` is strictly ignored and impossible to spoof.
   - Progress update body validates allowed numeric and boolean fields only.
6. **Provider-Agnostic Boundaries Preserved:**
   - Entitlements and enrollments require zero payment provider references.
   - Storage keys remain provider-agnostic abstractions without hard-coding cloud vendor URLs.
   - Commercial Phase 1E (Products, Offers, Orders, HitPay) is strictly NOT implemented.

7. **Phase 1D Audit Pass Fixes & Clarifications:**
   - **Entitlement Compound Index Semantics:** The unique active grant index is implemented as `{ userId: 1, targetType: 1, targetId: 1 }` with `{ unique: true, partialFilterExpression: { status: 'active' } }`. This strictly prevents duplicate concurrent active grants while preserving historical expired and revoked grants for compliance and auditability.
   - **Enrollment Uniqueness & Batch Null Semantics:** In MongoDB, documents with `batchId: null` participate in the unique index `{ userId: 1, courseId: 1, batchId: 1 }`. Mongoose enforces `batchId: null` by default, ensuring a student can have exactly one self-paced enrollment (`batchId: null`) and distinct cohort enrollments (`batchId: ObjectId`) without conflicting.
   - **Ownership Guard in Enrollment Creation:** `EnrollmentService.createEnrollmentFromEntitlement` explicitly validates that the entitlement belongs to the authenticated student (`expectedUserId`), preventing malicious cross-user enrollment creation.
   - **Public Curriculum Content Protection:** `CourseService.getCurriculum` sanitizes non-preview lessons by stripping `contentData` (video storage keys, pdf keys, body markdown) and private resources to ensure that public visitors or unenrolled users never receive private asset metadata.
   - **API Specification Alignment:** Deployed the canonical route `POST /api/v1/student/lessons/:lessonId/progress` alongside the hierarchical route `POST /api/v1/student/courses/:courseId/lessons/:lessonId/progress`, resolving lesson ownership and access consistently across both interfaces.
   - **Unauthenticated Error Differentiation:** `AccessService.requireLessonAccess` distinguishes unauthenticated requests (`AuthenticationError` -> HTTP 401) from unauthorized / drip-locked requests (`AuthorizationError` -> HTTP 403).

---

## Phase 1E Implementation Notes (Commerce + Payments Foundation)
1. **Zero Commercial Logic on Course:**
   - Verified that `CourseModel` remains completely canonical and untainted by commercial fields (no price, currency, marketCode, offerId, productId, payment state, or checkout logic).
2. **Commercial Catalog Separation:**
   - `ProductModel` (`src/core/domain/product.model.ts`): Represents the commercial asset being sold. Supports 1:N `ProductDeliverable` entries (`deliverableType: 'course' | 'batch'`).
   - `OfferModel` (`src/core/domain/offer.model.ts`): Market-specific commercial terms (`marketCode: 'SG' | 'MY'`, `currency: 'SGD' | 'MYR'`). Currency is strictly matched to market configuration. Compound indexes on `{ productId: 1, marketCode: 1 }`.
3. **Integer Minor Units Standard:**
   - All monetary properties (`basePriceMinorUnits`, `displayOriginalPriceMinorUnits`, `subtotalMinorUnits`, `discountMinorUnits`, `taxMinorUnits`, `totalMinorUnits`, `amountMinorUnits`) are stored strictly as integer minor units.
   - Validated with `Number.isInteger(val) && val >= 0`. Zero decimal arithmetic is used in persistence.
4. **Order Snapshot Invariant & Status Lifecycle:**
   - `OrderModel` (`src/core/domain/order.model.ts`): Captures and freezes the commercial agreement at checkout (`orderNumber`, `currency`, `subtotalMinorUnits`, `discountMinorUnits`, `taxMinorUnits`, `totalMinorUnits`, `billingDetails`, `status`). Subsequent mutations to `Offer` prices do not affect existing orders.
   - Documented statuses: `pending_payment`, `paid`, `payment_failed`, `refunded`, `cancelled`.
5. **Order vs. PaymentAttempt Retry Architecture:**
   - `PaymentAttemptModel` (`src/core/domain/payment-attempt.model.ts`): Order 1:N PaymentAttempt relation.
   - Retrying payment spawns `PaymentAttempt #N` linked to the same `Order` without creating duplicate orders. Sequential numbering is strictly maintained (`max(existing) + 1`).
   - Paid orders are permanently locked against retries.
6. **Decoupled Payment Provider Abstraction & Secret Isolation:**
   - `IPaymentProvider`: Standard contract with `createCheckoutSession` and `verifyWebhook`.
   - `MockPaymentProvider`: Self-contained deterministic mock provider requiring zero external network calls or credentials.
   - `HitPayProvider`: Gateway boundary implementing timing-safe HMAC-SHA256 signature verification (`crypto.timingSafeEqual`) over the raw request body.
   - `PaymentProviderFactory`: Resolves providers using market configuration references (e.g. `HITPAY_SG`) pointing to environment variables. Absolute rule: ZERO payment secrets in MongoDB or committed code.
7. **Webhook Ledger & Idempotency:**
   - `PaymentWebhookEventModel` (`src/core/domain/payment-webhook-event.model.ts`): Idempotency ledger with unique compound index `{ provider: 1, eventId: 1 }`.
   - Duplicate webhook callbacks are intercepted at the ledger and return HTTP 200 without duplicate fulfillment.
   - Integrity Check: Received payment currency and minor unit amount are strictly validated against `order.currency` and `order.totalMinorUnits`. Mismatches are marked `amount_mismatch` on the attempt and rejected.
   - Stale Attempt Guard: If an order has already been paid by a winning attempt, subsequent late callbacks from earlier attempts are marked `abandoned` and ignored.
8. **Payment-to-Entitlement Fulfillment:**
   - `PaymentFulfillmentService` (`src/core/services/payment-fulfillment.service.ts`):
     - Marks `PaymentAttempt` as `succeeded` and `Order` as `paid`.
     - Iterates over **all** `ProductDeliverable` items on the associated `Product`.
     - For `deliverableType === 'course'`: grants `Entitlement` via `EntitlementService` and provisions `Enrollment` via `EnrollmentService`.
     - For `deliverableType === 'batch'`: grants `Entitlement` with `targetType: 'batch'`, preserving deliverable reference while strictly deferring Phase 1F Batch engine capacity logic.
9. **API Endpoints:**
   - `POST /api/v1/store/checkout`: Authenticated student checkout endpoint; derives market from request context, freezes order snapshot, spawns attempt #1, calls provider.
   - `POST /api/v1/orders/:orderNumber/retry-payment`: Retries pending payment on existing order with attempt #N.
   - `POST /api/webhooks/payments/hitpay`: Ingests raw request text buffer, validates HMAC signature, ledger idempotency, and executes fulfillment.
   - `POST /api/webhooks/payments/mock`: Dev/testing simulator exercising production fulfillment logic; strictly disabled in production.

10. **Phase 1E Audit Remediation Notes:**
   - **Market-Specific HitPay Webhook Verification:** Redesigned `WebhookService.processWebhook` to parse the external reference from the raw body first, resolve the specific `PaymentAttempt` and parent `Order`, look up the authoritative `Market.paymentConfigurationRef` (`HITPAY_SG` or `HITPAY_MY`), and cryptographically verify the signature with the exact market salt. Prevents Malaysian (MY) webhooks from falsely failing SG verification.
   - **Transactionality & Idempotency Early Return:** Added multi-document transaction wrapping (`ClientSession.withTransaction`) to `PaymentFulfillmentService`. In local single-node MongoDB where transactions are prohibited, it cleanly catches topology errors, logs the limitation honestly, and completes writes safely. Updated the idempotency check to return immediately without duplicate writes when an order is already paid and the attempt is already succeeded.
   - **Exact Decimal-to-Integer Minor Units Conversion:** Implemented `parseDecimalToMinorUnits` in `HitPayProvider` using string parsing and integer arithmetic (`parseInt(intPart) * 100 + parseInt(fracPart)`). Eliminates all floating-point math (`parseFloat * 100`), strictly enforcing up to 2 decimal places and rejecting malformed or excessive fractional digits.
   - **Sanitized Raw Initiation Response:** Sanitized `PaymentAttempt.rawInitiationResponse` across both initial checkout and retry to persist only `{ sessionId, externalReference, redirectUrl }`, preventing internal credentials or headers from entering the database.
   - **Concurrent Retry Conflict Handling:** Wrapped `PaymentAttemptModel.create` in a retry loop catching MongoDB duplicate key error code `11000`, recalculating `attemptNumber = max(existing) + 1` dynamically without leaving broken orders.
   - **Checkout Provider Failure Lifecycle:** When payment provider initialization fails during checkout or retry, the attempt is marked `failed` (`errorMessage` set) and the order status is updated to `payment_failed`, leaving a valid auditable state.
   - **Deterministic Offer Selection:** Configured `.sort({ isPubliclyListed: -1, createdAt: -1 })` when querying active offers matching `(productId, marketCode)` at checkout to ensure deterministic resolution when multiple historical offers exist.

11. **Final Phase 1E Remediation — Fulfillment Transaction Boundary:**
   - **Transaction-Aware Enrollment & Entitlement Services:**
     - `EnrollmentService.createEnrollmentFromEntitlement(entitlementId, expectedUserId?, session?: ClientSession)` now accepts an optional `session` and applies it to all queries and mutations: `EntitlementModel.findById`, entitlement `save`, `CourseModel.findById`, `EnrollmentModel.findOne`, and `EnrollmentModel.create`.
     - `EntitlementService.grantEntitlement(input: GrantEntitlementInput)` now accepts optional `session?: ClientSession` and applies it across `UserModel.findById`, `CourseModel.findById`, `EntitlementModel.findOne`, entitlement `save`, and `EntitlementModel.create`.
     - Backward compatibility is preserved for existing callers invoking these methods without a session.
   - **Strict Fulfillment Error Propagation (No Swallowed Errors):**
     - Removed the `try/catch` block inside `PaymentFulfillmentService` that previously caught and swallowed course enrollment provisioning failures.
     - If entitlement grant fails or course enrollment creation fails, the error is immediately propagated outwards to abort and roll back the entire transaction. This guarantees that an order cannot end up in `paid` state and payment attempt in `succeeded` state with missing course enrollments.
   - **Replica Set vs. Standalone MongoDB Boundary:**
     - In MongoDB replica sets or sharded clusters (`mongos`), fulfillment (Order status, PaymentAttempt status, Entitlements, and Course Enrollments) executes atomically inside a single MongoDB multi-document transaction.
     - In standalone MongoDB topologies (e.g. default local instances running without `--replSet`), MongoDB transactions throw error code 20 (`IllegalOperation`). The service falls back to sequential execution with an explicit warning. Per architecture standards, sequential execution in standalone MongoDB is documented honestly as non-atomic.
   - **Batch Deliverable Boundary Invariant Preserved:**
     - Deliverables with `deliverableType === 'batch'` receive an Entitlement grant with `targetType: 'batch'`.
     - Batch enrollment creation, cohort assignments, capacity counters, schedules, and live meeting integrations remain strictly deferred to Phase 1F.
