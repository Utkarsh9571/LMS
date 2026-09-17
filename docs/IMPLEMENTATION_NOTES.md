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

