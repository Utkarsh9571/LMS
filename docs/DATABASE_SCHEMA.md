# Database Schema Specification (MongoDB & Mongoose)
## Multi-Market Custom LMS Platform

---

## 1. Monetary Data Type & Financial Precision Invariant

### The Floating-Point Invariant
JavaScript native `Number` uses IEEE 754 double-precision floating-point format, which introduces rounding errors (`0.1 + 0.2 = 0.30000000000000004`). In financial accounting, this is unacceptable.

### MongoDB & Mongoose Representation
All monetary values are stored strictly as **integer minor units** (e.g., SGD 999.00 = `99900`, MYR 2,999.00 = `299900`).
In Mongoose and MongoDB:
- The schema type is `Number` with `get: v => Math.round(v)` and `set: v => Math.round(v)` enforcement, or `mongoose.Schema.Types.Long` (from `mongoose-long` / BSON 64-bit integer `Long`).
- For standard multi-market currencies (SGD, MYR), 64-bit integer guarantees exact mathematical precision without decimals.
- Mongoose schemas apply a custom validator ensuring `Number.isInteger(val)` and `val >= 0`.
- Monetary values must **always** be accompanied by an ISO 4217 `currency` string field in the same document.

```typescript
// Mongoose Monetary Integer Validator Definition
export const monetaryIntegerSchema = {
  type: Number,
  required: true,
  validate: {
    validator: Number.isInteger,
    message: '{VALUE} is not an integer minor unit value.'
  },
  min: [0, 'Monetary amounts cannot be negative.']
};
```

---

## 2. Collections & Schemas

### `markets`
```javascript
{
  _id: ObjectId,
  code: String,                     // Index, unique ('SG', 'MY')
  name: String,                     // "Singapore", "Malaysia"
  countryCode: String,              // "SG", "MY"
  currency: String,                 // "SGD", "MYR"
  currencyMinorUnits: Number,       // 2 (e.g. cents, sen)
  timezone: String,                 // "Asia/Singapore", "Asia/Kuala_Lumpur"
  domains: [String],                // ["sg.bimacademy.com"] (Authoritative in Production)
  locale: String,                   // "en-SG", "en-MY"
  status: String,                   // 'active' | 'maintenance' | 'inactive'
  paymentProvider: String,          // 'hitpay' | 'mock'
  paymentConfigurationRef: String,  // "HITPAY_SG" (Points to env variables: process.env.HITPAY_SG_SALT)
  supportedPaymentMethods: [String],// ['card', 'paynow', 'fpx', 'duitnow']
  createdAt: Date,
  updatedAt: Date
}
```

### `users`
```javascript
{
  _id: ObjectId,
  email: String,                    // Index, unique (Global login across all markets)
  passwordHash: String,
  fullName: String,
  phone: String,                    // E.164 format (+65..., +60...)
  avatarUrl: String,
  globalRoles: [String],            // ['superadmin', 'admin', 'staff', 'instructor', 'student']
  status: String,                   // 'active' | 'suspended'
  lastActiveMarket: String,         // 'SG' | 'MY'
  createdAt: Date,
  updatedAt: Date
}
```

### `courses` (Canonical Content - Zero Commercial Logic)
```javascript
{
  _id: ObjectId,
  slug: String,                     // Index, unique ("revit-architecture-mastery")
  title: String,
  description: String,
  level: String,                    // 'beginner' | 'intermediate' | 'advanced' | 'professional'
  thumbnailUrl: String,
  status: String,                   // 'draft' | 'published' | 'archived'
  deliveryModes: [String],          // ['self_paced', 'cohort_batch']
  estimatedHours: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### `modules`
```javascript
{
  _id: ObjectId,
  courseId: ObjectId,               // Index (ref: 'courses')
  title: String,
  description: String,
  order: Number,                    // Sort order within course
  dripDaysAfterEnrollment: Number,  // Default: 0 (Unlocked immediately). If > 0, unlocks N days post-enrollment
  createdAt: Date,
  updatedAt: Date
}
```

### `lessons`
```javascript
{
  _id: ObjectId,
  courseId: ObjectId,               // Index (ref: 'courses')
  moduleId: ObjectId,               // Index (ref: 'modules')
  title: String,
  order: Number,                    // Sort order within module
  contentType: String,              // 'video' | 'pdf' | 'rich_text' | 'quiz' | 'assignment'
  contentData: {
    videoStorageKey: String,
    durationSeconds: Number,
    pdfStorageKey: String,
    bodyMarkdown: String,
    quizId: ObjectId,
    assignmentId: ObjectId
  },
  isPreviewFree: Boolean,           // If true, accessible without entitlement
  unlockOverrideDays: Number,       // Optional: null by default. If set, overrides parent module's dripDaysAfterEnrollment
  resources: [
    {
      title: String,
      storageKey: String,
      fileSizeBytes: Number,
      mimeType: String,
      downloadAllowed: Boolean
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### `products` (Commercial Definition)
```javascript
{
  _id: ObjectId,
  slug: String,                     // Index, unique
  title: String,
  description: String,
  deliverables: [
    {
      deliverableType: String,      // 'course' | 'batch' (future: 'workshop'|'bundle'|'membership'|'consultation')
      targetId: ObjectId,           // Reference to courses or batches
      titleOverride: String
    }
  ],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### `offers` (Market-Specific Commercial Terms)
```javascript
{
  _id: ObjectId,
  productId: ObjectId,              // Index (ref: 'products')
  marketCode: String,               // Index ('SG' | 'MY')
  currency: String,                 // 'SGD' | 'MYR'
  basePriceMinorUnits: Number,      // Integer: 99900 (SGD 999.00), strictly validated integer
  displayOriginalPriceMinorUnits: Number, // Integer
  isPubliclyListed: Boolean,
  status: String,                   // 'active' | 'expired' | 'disabled'
  createdAt: Date,
  updatedAt: Date
}
// Compound Index: { productId: 1, marketCode: 1 }
```

### `orders`
```javascript
{
  _id: ObjectId,
  orderNumber: String,              // Index, unique ("ORD-SG-2026-0001")
  userId: ObjectId,                 // Index (ref: 'users')
  marketCode: String,               // Index ('SG' | 'MY')
  productId: ObjectId,              // ref: 'products'
  offerId: ObjectId,                // ref: 'offers'
  currency: String,                 // 'SGD' | 'MYR'
  subtotalMinorUnits: Number,       // Integer minor units
  discountMinorUnits: Number,       // Integer minor units
  couponId: ObjectId,
  taxMinorUnits: Number,            // Integer minor units
  totalMinorUnits: Number,          // Integer minor units (Source of truth for payable amount)
  billingDetails: {
    fullName: String,
    email: String,
    phone: String,
    country: String
  },
  status: String,                   // 'pending_payment' | 'paid' | 'payment_failed' | 'refunded' | 'cancelled'
  activePaymentAttemptId: ObjectId, // ref: 'payment_attempts'
  createdAt: Date,
  updatedAt: Date
}
```

### `payment_attempts` (Supports Multiple Retries per Order)
```javascript
{
  _id: ObjectId,
  orderId: ObjectId,                // Index (ref: 'orders')
  attemptNumber: Number,            // 1, 2, 3...
  marketCode: String,               // 'SG' | 'MY'
  provider: String,                 // 'hitpay' | 'mock'
  externalReference: String,        // HitPay Payment Request ID / Reference
  currency: String,                 // 'SGD' | 'MYR'
  amountMinorUnits: Number,         // Integer minor units
  paymentMethod: String,            // 'paynow', 'fpx', 'card'
  status: String,                   // 'initiated' | 'pending' | 'succeeded' | 'failed' | 'abandoned'
  errorMessage: String,
  rawInitiationResponse: Object,
  paidAt: Date,
  createdAt: Date,
  updatedAt: Date
}
// Compound Index: { orderId: 1, attemptNumber: 1 }
```

### `payment_webhook_events` (Idempotency Ledger)
```javascript
{
  _id: ObjectId,
  provider: String,                 // 'hitpay' | 'mock'
  eventId: String,                  // Unique provider event ID / transaction ID (Unique Index)
  orderId: ObjectId,                // ref: 'orders'
  paymentAttemptId: ObjectId,       // ref: 'payment_attempts'
  status: String,                   // 'received' | 'processed' | 'ignored_duplicate' | 'failed'
  payloadHash: String,              // SHA256 of raw webhook body for audit
  receivedAt: Date,
  processedAt: Date
}
// Unique Index: { provider: 1, eventId: 1 }
```

### `entitlements` (Generic Access Grant)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                 // Index (ref: 'users')
  sourceOrderId: ObjectId,          // Optional (ref: 'orders')
  marketCode: String,               // 'SG' | 'MY'
  targetType: String,               // 'course' | 'batch' (future: 'workshop'|'bundle'|'membership'|'consultation')
  targetId: ObjectId,               // Generic reference to target Course or Batch
  status: String,                   // 'active' | 'suspended' | 'revoked' | 'expired'
  grantedAt: Date,
  expiresAt: Date                   // Null indicates lifetime access
}
// Compound Unique-Active Index: { userId: 1, targetType: 1, targetId: 1, status: 1 }
```

### `enrollments` & `lesson_progress`
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                 // Index (ref: 'users')
  courseId: ObjectId,               // Index (ref: 'courses')
  batchId: ObjectId,                // Optional (ref: 'batches')
  entitlementId: ObjectId,          // ref: 'entitlements'
  status: String,                   // 'active' | 'completed' | 'dropped'
  enrolledAt: Date,
  completedAt: Date,
  progressPercent: Number           // 0-100 cache
}
// Compound Unique Index: { userId: 1, courseId: 1, batchId: 1 }
```

### `batches` (Atomic Capacity Control)
```javascript
{
  _id: ObjectId,
  courseId: ObjectId,               // Index (ref: 'courses')
  marketCode: String,               // 'SG' | 'MY' (Index)
  code: String,                     // Unique Index ("REVIT-SG-2026-Q1")
  name: String,
  description: String,
  primaryInstructorId: ObjectId,    // Index (ref: 'users')
  startDate: Date,
  endDate: Date,
  enrollmentOpenAt: Date,           // Optional enrollment window start
  enrollmentCloseAt: Date,          // Optional enrollment window end
  capacity: Number,                 // e.g. 25
  enrolledCount: Number,            // Strictly incremented atomically: { $inc: { enrolledCount: 1 } }
  status: String,                   // 'draft' | 'upcoming' | 'enrolling' | 'in_progress' | 'completed' | 'cancelled'
  meetingProvider: String,          // 'mock' | 'zoom' | 'google_meet' (default: 'mock')
  createdAt: Date,
  updatedAt: Date
}
// Unique Index: { code: 1 }
// Compound Index: { courseId: 1, status: 1 }
// Compound Index: { marketCode: 1, status: 1 }
// Compound Index: { primaryInstructorId: 1, status: 1 }
// Compound Index: { status: 1, enrollmentOpenAt: 1, enrollmentCloseAt: 1 }
```

### `live_sessions` (Scheduled Cohort Video Classes)
```javascript
{
  _id: ObjectId,
  batchId: ObjectId,                // Index (ref: 'batches')
  courseId: ObjectId,               // Index (ref: 'courses')
  title: String,
  description: String,
  status: String,                   // 'scheduled' | 'live' | 'completed' | 'cancelled'
  startTime: Date,
  endTime: Date,
  durationMinutes: Number,
  meetingProvider: String,          // 'mock' | 'zoom' | 'google_meet' (default: 'mock')
  providerMeetingId: String,
  hostUrl: String,                  // Protected: instructor / admin only
  studentJoinUrl: String,           // Student join URL
  recordingStatus: String,          // 'none' | 'processing' | 'available' | 'failed'
  recordingUrl: String,
  recordingDurationSeconds: Number,
  createdAt: Date,
  updatedAt: Date
}
// Compound Index: { batchId: 1, startTime: 1 }
// Compound Index: { courseId: 1, startTime: 1 }
// Index: { status: 1 }
```

### `attendances` (Idempotent Live Class Participation)
```javascript
{
  _id: ObjectId,
  liveSessionId: ObjectId,          // Index (ref: 'live_sessions')
  batchId: ObjectId,                // Index (ref: 'batches')
  userId: ObjectId,                 // Index (ref: 'users')
  status: String,                   // 'present' | 'late' | 'absent' | 'excused'
  joinedAt: Date,                   // Initial arrival timestamp
  lastSeenAt: Date,                 // Updated on subsequent joins
  joinCount: Number,                // Number of join clicks
  ipAddress: String,
  createdAt: Date,
  updatedAt: Date
}
// Unique Compound Index: { liveSessionId: 1, userId: 1 }
// Compound Index: { batchId: 1, userId: 1 }
// Compound Index: { userId: 1, status: 1 }
```
