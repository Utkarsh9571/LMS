# Enrollment & Access Specification
## Multi-Market Custom LMS Platform

---

## 1. Fulfillment Pipeline & Multi-Deliverable Handling

When an Order is paid, the fulfillment engine iterates through all `deliverables` on the purchased `Product`:

```text
       Payment Succeeded (HitPay Webhook or Mock Trigger)
                                │
                                ▼
               OrderService.fulfillOrder(orderId)
                                │
      Loop each deliverable in Product.deliverables:
      ├── Deliverable 1 (type: 'course', targetId: 'crs_101')
      └── Deliverable 2 (type: 'batch',  targetId: 'btc_202')
                                │
                                ▼
         EntitlementService.grantIdempotent({ userId, targetType, targetId })
                                │
         EnrollmentService.ensureEnrollment({ userId, courseId, batchId })
                                │
         If deliverable is a Batch:
         BatchService.incrementEnrolledCountAtomic(batchId)
```

### Handling Existing / Duplicate Entitlements
If a student purchases a product that includes a course they already own:
1. `EntitlementService` queries for an existing active entitlement matching `{ userId, targetType, targetId, status: 'active' }`.
2. If found, it **preserves** the existing entitlement and logs the additional order reference without creating a conflicting duplicate active grant.
3. If the existing entitlement has an expiration date, it extends `expiresAt` by the new term duration.

---

## 2. Access Resolution Algorithm (Content Unlocking)

```typescript
export async function canAccessLesson(userId: string, lessonId: string): Promise<{
  granted: boolean;
  reason?: 'unauthenticated' | 'no_entitlement' | 'drip_locked';
  unlocksAt?: Date;
}> {
  const lesson = await LessonModel.findById(lessonId).populate('moduleId');
  if (!lesson) return { granted: false, reason: 'no_entitlement' };

  // Free preview lessons bypass entitlement checks
  if (lesson.isPreviewFree) {
    return { granted: true };
  }

  // 1. Verify Active Entitlement for Course (Direct Course Entitlement OR Active Batch Entitlement backing an active Enrollment)
  let hasActiveEntitlement = await EntitlementModel.exists({
    userId,
    targetType: 'course',
    targetId: lesson.courseId,
    status: 'active',
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
  });

  if (!hasActiveEntitlement) {
    // Check if user has an active batch enrollment backing this course
    const batchEnrollments = await EnrollmentModel.find({
      userId,
      courseId: lesson.courseId,
      batchId: { $ne: null },
      status: 'active'
    }).select('entitlementId');

    if (batchEnrollments.length > 0) {
      const entitlementIds = batchEnrollments.map(e => e.entitlementId);
      hasActiveEntitlement = await EntitlementModel.exists({
        _id: { $in: entitlementIds },
        status: 'active',
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
      });
    }
  }

  if (!hasActiveEntitlement) {
    return { granted: false, reason: 'no_entitlement' };
  }

  // 2. Evaluate Drip Schedule (Module-level with optional Lesson-level override)
  const enrollment = await EnrollmentModel.findOne({
    userId,
    courseId: lesson.courseId,
    status: 'active'
  });

  if (!enrollment) {
    return { granted: false, reason: 'no_entitlement' };
  }

  const moduleDoc = lesson.moduleId as any;
  const moduleDripDays = moduleDoc?.dripDaysAfterEnrollment || 0;
  const effectiveDripDays = (typeof lesson.unlockOverrideDays === 'number')
    ? lesson.unlockOverrideDays
    : moduleDripDays;

  if (effectiveDripDays > 0) {
    const unlockTime = enrollment.enrolledAt.getTime() + effectiveDripDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (now < unlockTime) {
      return {
        granted: false,
        reason: 'drip_locked',
        unlocksAt: new Date(unlockTime)
      };
    }
  }

  return { granted: true };
}
```
