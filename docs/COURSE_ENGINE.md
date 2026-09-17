# Course Engine Specification
## Multi-Market Custom LMS Platform

---

## 1. Canonical Curriculum Hierarchy

```text
Course (e.g. Revit Architecture Professional)
  │
  ├── Module 1: Foundations of BIM & Interface
  │     ├── dripDaysAfterEnrollment: 0 (Unlocked immediately)
  │     ├── Lesson 1.1: Introduction to Parametric Elements (Video)
  │     ├── Lesson 1.2: Standard BIM Execution Plan (PDF Resource)
  │     └── Lesson 1.3: Interface Knowledge Check (Quiz)
  │
  └── Module 2: Structural Modeling & Coordination
        ├── dripDaysAfterEnrollment: 7 (Unlocks 7 days post-enrollment)
        ├── Lesson 2.1: Grids, Columns, Foundations (Video)
        ├── Lesson 2.2: Family Creation Reference Guide (Rich Text)
        └── Lesson 2.3: Villa Structural Framework (Assignment)
```

---

## 2. Shared Canonical Invariant

- **Zero Commercial Coupling:** A `Course` record contains **no** currency, price, discount, or payment vendor logic.
- **Content Reusability:** Course records are globally unique educational assets referenced by commercial `ProductDeliverable` records across Singapore, Malaysia, and future markets.

---

## 3. Drip Content & Unlocking Model

### Hierarchy & Priority Rule
To maintain simplicity and prevent field duplication across both levels:
1. **Module-Level Drip (Primary):** `Module.dripDaysAfterEnrollment` defines how many days after the student's enrollment date the module unlocks. Default is `0` (unlocked immediately).
2. **Lesson-Level Override (Optional):** `Lesson.unlockOverrideDays` is optional (`null` by default). If populated with an integer, it overrides the parent module's drip schedule for that specific lesson.

### Deterministic Unlock Algorithm
```typescript
interface UnlockEvaluation {
  isUnlocked: boolean;
  unlocksAt: Date;
  daysRemaining: number;
}

export function evaluateLessonUnlock(
  enrollmentDate: Date,
  moduleDripDays: number = 0,
  lessonOverrideDays?: number | null
): UnlockEvaluation {
  const effectiveDays = (typeof lessonOverrideDays === 'number') 
    ? lessonOverrideDays 
    : moduleDripDays;

  const unlocksAt = new Date(enrollmentDate.getTime() + effectiveDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const isUnlocked = now >= unlocksAt;
  const daysRemaining = isUnlocked ? 0 : Math.ceil((unlocksAt.getTime() - now.getTime()) / (1000 * 3600 * 24));

  return { isUnlocked, unlocksAt, daysRemaining };
}
```

---

## 4. Lesson Content Types

1. **Video Lesson:** Embed or secure storage playback (supports S3/Cloudinary or Mock). Stores `durationSeconds`.
2. **PDF / Document Lesson:** In-browser viewer for technical drafting standards and BIM documentation.
3. **Rich Text Lesson:** Markdown/HTML formatted technical documentation with code and command blocks.
4. **Quiz:** MCQ assessment engine with configurable pass percentage.
5. **Project Assignment:** Practical BIM submission portal accepting `.rvt`, `.nwd`, `.ifc`, `.pdf`, or `.zip` archives.
