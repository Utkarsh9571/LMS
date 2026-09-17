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
| **Phase 1E** | Commerce, Orders & Payments | ⏳ Not Started | Product, Offer, Order, HitPay Webhook fulfillment *(Next phase)* |
| **Phase 1F** | Batch Engine & Cohorts | ⏳ Not Started | Capacity control, Live sessions, Attendance |
| **Phase 1G** | Assessments & Certificates | ⏳ Not Started | Quizzes, assignments, dynamic PDF certificates |

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
Create `.env.local` with required secrets:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/lms
SESSION_SECRET=your_super_secret_jwt_signing_key_at_least_32_characters_long
USE_MOCK_PAYMENT=true
USE_MOCK_MEETING=true
```

### Available Scripts
```bash
# Start Next.js development server
npm run dev

# Run complete automated verification test suite (Phase 1B, 1C, 1D)
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
