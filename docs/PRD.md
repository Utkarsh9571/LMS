# Product Requirements Document (PRD)
## Multi-Market Custom LMS Platform (Singapore & Malaysia)

---

## 1. Executive Summary & Vision

This platform is a custom-built, multi-market Learning Management System (LMS) specifically architected for a professional Building Information Modeling (BIM) and architectural engineering training organization.

The platform provides a dual-modality educational experience:
1. **Self-Paced Learning:** Pre-recorded modular video courses, technical PDF standards, rich text guides, BIM model resources, quizzes, and project assignments.
2. **Instructor-Led Cohort / Batch Training:** Operational cohort delivery instances with scheduled live interactive sessions, batch rosters, attendance tracking, and practical project submissions reviewed by instructors.

### Target Markets (V1)
- **Singapore (SG):** Currency `SGD`, Timezone `Asia/Singapore`, Payment via `HitPay` (PayNow, Cards).
- **Malaysia (MY):** Currency `MYR`, Timezone `Asia/Kuala_Lumpur`, Payment via `HitPay` (FPX, DuitNow, Cards).

### Boundary with Existing Indian Ecosystem
- The organization currently operates in India using **TagMango** and **Razorpay**.
- The Indian platform remains completely separate.
- **Strict V1 Invariant:** No synchronization, no API bridges, no automatic migration, and no Razorpay integration will be built in V1. However, the schema design avoids assumptions that would preclude future data federation or single sign-on.

---

## 2. Core Business Principles & Invariants

1. **Shared Canonical Catalog:**
   - A `Course` represents pure educational curriculum (`Course -> Module -> Lesson -> Resource/Assignment/Quiz`).
   - A Course contains **zero** currency, **zero** prices, **zero** market identifiers, and **zero** checkout logic.
   - The same course (e.g., *Revit Architecture Professional*) is authored once and shared across Singapore, Malaysia, and potential future markets.

2. **Decoupled Commercial Architecture:**
   - Commercial offerings are modeled via `Product` and `Offer`.
   - A `Product` encapsulates one or more `ProductDeliverable` items (e.g., Course or Batch).
   - An `Offer` specifies market-specific commercial terms (price in minor units, currency, payment terms).
   - Purchases create an `Order` -> processed via `Payment` -> grants an `Entitlement` -> fulfills into an `Enrollment` -> unlocks content `Access`.

3. **Multi-Tenant / Multi-Market Authority:**
   - In **Production**, market resolution is strictly authoritative based on domain/hostname (e.g., `sg.bimacademy.com` resolves to `SG`, `my.bimacademy.com` resolves to `MY`). Users cannot override markets via URL query parameters or request headers.
   - In **Local Development**, market resolution can be simulated via query parameters (`?market=SG`), request headers, or developer cookie switchers.

4. **Zero Secrets in Database:**
   - The database stores operational configuration and credential references (e.g., `credentialRef: "HITPAY_SG"`).
   - Raw API keys, merchant salts, and webhook secrets are stored exclusively in environment variables / secure secret stores.

5. **Provider Agnosticism:**
   - Every external service (Payment, Storage, Live Meetings, Notifications) sits behind a TypeScript abstraction interface with full **Mock implementations** available.
   - The system must function completely offline and in development environments without live merchant or API credentials.

---

## 3. User Personas & Roles

| Role | Description | Primary Capabilities |
|---|---|---|
| **Super Admin** | Platform owner & executive | Global market management, user role assignment, audit logs, global commercial overview. |
| **Admin** | Operations & academic administrator | Course curriculum authoring, Product & Offer configuration, Batch scheduling, Order & refund management. |
| **Instructor** | BIM technical trainer | Batch cohort management, live class launch, attendance inspection, student assignment review & grading. |
| **Student / Learner** | Enrolled professional | Market storefront checkout, self-paced lesson viewing, live session attendance, assignment submission, certificate download. |

---

## 4. Feature Matrix: V1 Scope vs. Future Scope

| Functional Domain | V1 MVP Scope (Implemented) | Future Scope (Architected, Not Implemented in V1) |
|---|---|---|
| **Markets** | Singapore (SG) & Malaysia (MY) | India federation, Indonesia (ID), Vietnam (VN), Middle East |
| **Currencies** | SGD, MYR (integer minor units) | Dynamic multi-currency FX auto-conversion, INR, USD |
| **Deliverable Types** | `course`, `batch` | `workshop`, `bundle`, `membership`, `consultation` |
| **Entitlement Types** | `course`, `batch` | `workshop`, `bundle`, `membership`, `consultation` |
| **Market Resolution** | Hostname in Prod; Query/Cookie in Dev | Geolocation IP auto-detection with country confirmation |
| **Payments** | `MockPaymentProvider`, `HitPayProvider` scaffolding | Razorpay (India), Stripe, GrabPay direct SDK, Apple/Google Pay |
| **Live Meetings** | `MockMeetingProvider` (interactive mock room & URLs) | Direct Zoom Server-to-Server OAuth, Google Meet API |
| **Storage** | `LocalMockStorageProvider` (local dev disk) | AWS S3 / Cloudflare R2 signed uploads, Cloudinary |
| **Assignments** | File upload (.rvt, .nwd, .pdf, .zip), grading & feedback | Automated BIM model compliance checking, plagiarism detection |
| **Quizzes** | Basic multiple-choice quizzes with pass scores | Timed proctored exams, randomized question pools |
| **Certificates** | Standard dynamic PDF generation upon 100% progress | Drag-and-drop visual canvas certificate designer |
| **Community** | Direct cohort announcement feed & links | Full Discord/Slack-style live chat rooms, social forums |
| **Marketing** | Fixed coupon codes (percentage & fixed amount) | Multi-tier affiliate commission engine, abandoned cart funnels |
