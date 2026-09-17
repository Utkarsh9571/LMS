# Batch & Cohort Engine Specification
## Multi-Market Custom LMS Platform

---

## 1. Operational Cohort Concept

A **Batch** is an operational delivery instance of a canonical Course:
- A Course defines the curriculum.
- A Batch defines the schedule, live sessions, assigned instructor, enrolled students, and operational dates.

```text
                             Course: Revit Architecture
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              ▼                          ▼                          ▼
     Batch SG-2026-Q1           Batch MY-2026-Q1          Batch Weekend-BIM
     Instructor: John           Instructor: Sarah         Instructor: David
     Time: Sat 10:00 SGT        Time: Sun 14:00 MYT       Time: Sat 18:00 SGT
     Capacity: 25               Capacity: 30              Capacity: 15
```

---

## 2. Race-Condition-Free Atomic Capacity Allocation

In high-demand cohort launches, concurrent student purchases could potentially oversell a batch (e.g., admitting 26 students into a 25-seat room).

### The Invariant
A batch enrollment must **never** exceed its designated `capacity`.

### Atomic Database Allocation Algorithm
We do not use read-then-write checks (`if (enrolled < capacity) { enrolled++ }`). We execute an atomic update with conditional query filter:

```typescript
export async function claimBatchSeatAtomic(
  batchId: string,
  session?: ClientSession
): Promise<{ success: boolean; message?: string }> {
  // Executes an atomic update guarded by condition: enrolledCount < capacity
  const updateResult = await BatchModel.updateOne(
    {
      _id: batchId,
      status: { $in: ['upcoming', 'enrolling'] },
      $expr: { $lt: ['$enrolledCount', '$capacity'] }
    },
    {
      $inc: { enrolledCount: 1 }
    },
    { session }
  );

  if (updateResult.modifiedCount === 0) {
    return {
      success: false,
      message: 'Batch is currently full or not open for enrollment.'
    };
  }

  return { success: true };
}
```

If seat allocation fails during fulfillment (e.g. the last seat was claimed during payment processing), the transaction halts, the order is flagged for administrative review/waitlisting, and the payment attempt is recorded for auto-refund or batch reallocation.

---

## 3. Live Class Execution Lifecycle

1. **Schedule Creation:** Admin or Instructor schedules a `LiveSession` attached to a Batch.
2. **Provider Dispatch:** `ILiveMeetingProvider.createMeeting(...)` allocates meeting IDs and URLs.
3. **Session Countdown:** Students see live countdown inside their student portal.
4. **Attendance Logging:** When a student clicks "Join Live Class", an `IAttendance` record is stamped with `joinedAt` and status `present`.
5. **Recording Archival:** After session conclusion, instructor or automated webhook stores the recording URL/storage key on the `LiveSession` document.
