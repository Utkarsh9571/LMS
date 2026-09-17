# Domain Model Specification
## Multi-Market Custom LMS Platform

---

## 1. Domain Entities & Bounded Contexts

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CANONICAL DOMAIN                                │
│                                                                             │
│   Course ────1:N──── Module (dripDaysAfterEnrollment)                       │
│                        │                                                    │
│                        └───1:N──── Lesson (optional unlockOverrideDays)     │
│                                      │                                      │
│                                      ├── Resource                           │
│                                      ├── Quiz ────1:N──── Question          │
│                                      └── Assignment                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Target of
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMMERCIAL DOMAIN                                │
│                                                                             │
│   Product ────1:N──── ProductDeliverable (type: 'course' | 'batch')         │
│      │                                                                      │
│      └───1:N──── Offer (marketCode: 'SG' | 'MY', currency: 'SGD' | 'MYR')   │
│                    │                                                        │
│                    └─── Used in ───> Order                                  │
│                                        │                                    │
│                                        ├──1:N── PaymentAttempt (Retries)    │
│                                        └──1:1── WebhookEvent (Idempotent)   │
└────────────────────────────────────────┬────────────────────────────────────┘
                                         │ Fulfills into
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FULFILLMENT DOMAIN                               │
│                                                                             │
│   Entitlement (targetType: 'course' | 'batch' | ...)                        │
│        │                                                                    │
│        └─── Instantiates ───> Enrollment ────1:1──── Progress               │
│                                  │                                          │
│                                  └─── AssignmentSubmission                 │
│                                                                             │
│   Batch (Atomic capacity control: enrolledCount < capacity)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Entity Models & Specifications

### A. Commercial Domain: Products, Deliverables & Offers
```typescript
export type V1DeliverableType = 'course' | 'batch';
export type FutureDeliverableType = 'workshop' | 'bundle' | 'membership' | 'consultation';
export type DeliverableType = V1DeliverableType | FutureDeliverableType;

export interface IProductDeliverable {
  deliverableType: DeliverableType;
  targetId: string;                  // CourseId or BatchId
  titleOverride?: string;
}

export interface IProduct {
  _id: string;
  slug: string;                      // e.g. "revit-architecture-mastery"
  title: string;
  description: string;
  deliverables: IProductDeliverable[]; // 1:N relationship
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOffer {
  _id: string;
  productId: string;
  marketCode: 'SG' | 'MY' | string;
  currency: 'SGD' | 'MYR' | string;
  basePriceMinorUnits: number;       // Validated Integer Minor Units (e.g. 99900)
  displayOriginalPriceMinorUnits?: number;
  isPubliclyListed: boolean;
  status: 'active' | 'expired' | 'disabled';
}
```

### B. Orders, PaymentAttempts & Webhook Events
```typescript
export interface IOrder {
  _id: string;
  orderNumber: string;               // e.g. "ORD-SG-2026-0042"
  userId: string;
  marketCode: string;                // 'SG' | 'MY'
  productId: string;
  offerId: string;
  currency: string;                  // 'SGD' | 'MYR'
  subtotalMinorUnits: number;        // Integer minor units
  discountMinorUnits: number;
  couponId?: string;
  taxMinorUnits: number;
  totalMinorUnits: number;           // Integer minor units
  billingDetails: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
  };
  status: 'pending_payment' | 'paid' | 'payment_failed' | 'refunded' | 'cancelled';
  activePaymentAttemptId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentAttempt {
  _id: string;
  orderId: string;
  attemptNumber: number;             // 1, 2, 3...
  marketCode: string;
  provider: 'hitpay' | 'mock';
  externalReference?: string;        // Gateway reference
  currency: string;
  amountMinorUnits: number;
  paymentMethod?: string;
  status: 'initiated' | 'pending' | 'succeeded' | 'failed' | 'abandoned';
  errorMessage?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentWebhookEvent {
  _id: string;
  provider: 'hitpay' | 'mock';
  eventId: string;                   // External unique event ID
  orderId: string;
  paymentAttemptId?: string;
  status: 'received' | 'processed' | 'ignored_duplicate' | 'failed';
  payloadHash: string;
  receivedAt: Date;
  processedAt?: Date;
}
```

### C. Pedagogy: Modules & Lessons (Clean Drip Model)
```typescript
export interface IModule {
  _id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  dripDaysAfterEnrollment: number;   // Primary drip setting (default: 0)
}

export interface ILesson {
  _id: string;
  courseId: string;
  moduleId: string;
  title: string;
  order: number;
  contentType: 'video' | 'pdf' | 'rich_text' | 'quiz' | 'assignment';
  contentData: {
    videoStorageKey?: string;
    durationSeconds?: number;
    pdfStorageKey?: string;
    bodyMarkdown?: string;
    quizId?: string;
    assignmentId?: string;
  };
  isPreviewFree: boolean;
  unlockOverrideDays?: number | null; // Optional override; defaults to null
}
```

### D. Generic Entitlement Model
```typescript
export type V1EntitlementTargetType = 'course' | 'batch';
export type FutureEntitlementTargetType = 'workshop' | 'bundle' | 'membership' | 'consultation';
export type EntitlementTargetType = V1EntitlementTargetType | FutureEntitlementTargetType;

export interface IEntitlement {
  _id: string;
  userId: string;
  sourceOrderId?: string;
  marketCode: string;
  targetType: EntitlementTargetType;
  targetId: string;
  grantedAt: Date;
  expiresAt?: Date;                  // Null indicates lifetime access
  status: 'active' | 'suspended' | 'revoked' | 'expired';
}
```
