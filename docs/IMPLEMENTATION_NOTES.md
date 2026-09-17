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
   - 15 automated tests executed via `npm test` verifying password strength, hashing, session tamper-resistance, RBAC role and permission assertions, and production vs. development market resolution rules.
