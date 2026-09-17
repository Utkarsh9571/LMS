# Implementation Roadmap
## Multi-Market Custom LMS Platform

---

## Phase 1: Foundation & Modular Monolith Setup (Current Target)
- Setup Next.js 16/App Router, TypeScript, Tailwind CSS, Mongoose DB connection.
- Market Context middleware (production hostname detection + dev switcher).
- Canonical Course & Curriculum builder (Course, Module, Lesson, Resources).
- Product & Deliverables model (`Product -> ProductDeliverable: Course | Batch`).
- Market Offers & Pricing in integer minor units (SGD & MYR).
- `MockPaymentProvider` + Scaffolding for `HitPayProvider`.
- Decoupled Entitlement & Enrollment engine.
- Batch & Cohort scheduling with `MockMeetingProvider`.
- Student portal (Course player, Batch countdown, Join live class).
- Instructor portal (Cohort roster, Live session host, Assignment grading).

## Phase 2: Provider Realization & Commerce Polish
- HitPay live webhook verification with environment variable salt lookups.
- Cloudflare R2 / AWS S3 signed media uploads for BIM files (.rvt, .nwd).
- Zoom Server-to-Server OAuth integration for automated live class links.
- Transactional email notifications (Welcome, Order receipt, Live class reminder).

## Phase 3: Pedagogy & Engagement Enhancements
- Interactive Quiz engine with instant grading and pass score thresholds.
- Dynamic SVG/PDF Certificate generation upon 100% course progress.
- In-lesson Q&A discussion threads.

## Phase 4: Scale, Analytics & Enterprise Features
- Multi-market sales and attendance analytics dashboards.
- Corporate bulk seat purchasing and team manager portal.
- Future evaluation of India TagMango data ingestion / federation readiness.
