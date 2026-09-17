# Role-Based Access Control (RBAC) Specification
## Multi-Market Custom LMS Platform

---

## 1. Role Hierarchy

```text
               Super Admin (Global System & Financial Authority)
                      │
                      ▼
               Admin (Academic Operations & Market Commerce)
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
    Instructor                  Student
(Batch & Grading Scope)    (Entitlement Scope)
```

---

## 2. Permission Matrix

| Capability | Super Admin | Admin | Instructor | Student |
|---|:---:|:---:|:---:|:---:|
| **Market Management** (`markets:manage`) | ✅ | ❌ | ❌ | ❌ |
| **Course Authoring** (`courses:write`) | ✅ | ✅ | ❌ | ❌ |
| **Product & Offer Pricing** (`commerce:write`) | ✅ | ✅ | ❌ | ❌ |
| **Batch Management** (`batches:write`) | ✅ | ✅ | Assigned Only | ❌ |
| **Launch Live Session** (`sessions:host`) | ✅ | ✅ | Assigned Only | ❌ |
| **Grade Submissions** (`assignments:grade`) | ✅ | ✅ | Assigned Only | ❌ |
| **Order Ledger & Refunds** (`orders:write`) | ✅ | ✅ | ❌ | ❌ |
| **Access Course Content** (`content:read`) | ✅ | ✅ | Assigned Only | If Entitled |
| **Submit Assignment** (`assignments:submit`)| ❌ | ❌ | ❌ | If Entitled |

---

## 3. Enforcement Strategy

RBAC is enforced via:
1. **Route Level Guards:** Next.js middleware guards `/admin/*`, `/instructor/*`, and `/student/*`.
2. **Domain Service Guards:** Services enforce fine-grained checks (e.g. verifying an Instructor is assigned to a Batch before permitting live session launch or grading).
3. **Entitlement Guards:** `canAccessLesson(userId, lessonId)` verifies the student's active entitlement before streaming video or signed file URLs.
