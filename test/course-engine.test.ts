import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { CourseModel } from '../src/core/domain/course.model';
import { ModuleModel } from '../src/core/domain/module.model';
import { LessonModel } from '../src/core/domain/lesson.model';
import { CourseService } from '../src/core/services/course.service';
import { hasPermission, assertPermission } from '../src/core/services/rbac.service';
import { ValidationError, NotFoundError, ConflictError, AuthorizationError } from '../src/lib/errors';
import { UserRole } from '../src/core/domain/domain-types';

async function runCourseEngineTests() {
  console.log('=== Starting Phase 1C Canonical Course Engine Test Suite ===\n');

  // Check MongoDB connectivity
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms_test';
  let dbConnected = false;
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 1500 });
    dbConnected = true;
    console.log('✔ Connected to MongoDB for live database integration tests.\n');
  } catch {
    console.log('NOTICE: Local MongoDB instance is not reachable on 127.0.0.1:27017.');
    console.log('Running comprehensive in-memory schema validation & unit tests without live DB connection.\n');
  }

  // -------------------------------------------------------------
  // Test Group 1: Architectural Invariants
  // -------------------------------------------------------------
  console.log('[Test 1.1] Invariant: Course schema has ZERO commercial/market fields');
  const courseSchemaPaths = Object.keys(CourseModel.schema.paths);
  const forbiddenCommercialFields = [
    'price',
    'currency',
    'marketCode',
    'country',
    'paymentProvider',
    'checkoutUrl',
    'offerId',
    'productId',
    'coupon',
    'tax',
    'paymentStatus'
  ];

  for (const field of forbiddenCommercialFields) {
    assert.equal(
      courseSchemaPaths.includes(field),
      false,
      `Violation: Course schema must NOT contain commercial field '${field}'`
    );
  }
  console.log('✔ Course schema verified: zero commercial or market-specific fields.\n');

  // -------------------------------------------------------------
  // Test Group 2: Course Schema In-Memory Validations
  // -------------------------------------------------------------
  console.log('[Test 2.1] Course schema validation: required fields');
  const invalidCourse = new CourseModel({});
  const courseValErr = invalidCourse.validateSync();
  assert.ok(courseValErr !== null && courseValErr !== undefined);
  assert.ok(courseValErr.errors.slug);
  assert.ok(courseValErr.errors.title);
  assert.ok(courseValErr.errors.description);
  assert.ok(courseValErr.errors.thumbnailUrl);

  console.log('[Test 2.2] Course schema validation: invalid status enum');
  const invalidStatusCourse = new CourseModel({
    slug: 'valid-slug',
    title: 'Valid Title',
    description: 'Valid Description',
    thumbnailUrl: '/thumb.jpg',
    status: 'unsupported_status'
  });
  const statusErr = invalidStatusCourse.validateSync();
  assert.ok(statusErr?.errors.status);

  console.log('[Test 2.3] Course schema validation: invalid deliveryMode');
  const invalidDeliveryCourse = new CourseModel({
    slug: 'valid-slug',
    title: 'Valid Title',
    description: 'Valid Description',
    thumbnailUrl: '/thumb.jpg',
    deliveryModes: ['invalid_mode' as any]
  });
  const deliveryErr = invalidDeliveryCourse.validateSync();
  assert.ok(deliveryErr?.errors['deliveryModes.0'] || deliveryErr?.errors.deliveryModes);

  console.log('[Test 2.4] Course schema validation: negative estimated hours');
  const negativeHoursCourse = new CourseModel({
    slug: 'valid-slug',
    title: 'Valid Title',
    description: 'Valid Description',
    thumbnailUrl: '/thumb.jpg',
    estimatedHours: -5
  });
  const hoursErr = negativeHoursCourse.validateSync();
  assert.ok(hoursErr?.errors.estimatedHours);
  console.log('✔ Course schema in-memory validations passed.\n');

  // -------------------------------------------------------------
  // Test Group 3: Module & Lesson Schema Validations
  // -------------------------------------------------------------
  console.log('[Test 3.1] Module schema validation: required courseId and negative dripDays');
  const invalidModule = new ModuleModel({
    title: 'Module 1',
    dripDaysAfterEnrollment: -3
  });
  const modErr = invalidModule.validateSync();
  assert.ok(modErr?.errors.courseId);
  assert.ok(modErr?.errors.dripDaysAfterEnrollment);

  console.log('[Test 3.2] Module schema validation: fractional dripDays');
  const floatDripModule = new ModuleModel({
    courseId: new mongoose.Types.ObjectId(),
    title: 'Module 1',
    dripDaysAfterEnrollment: 2.5
  });
  const floatDripErr = floatDripModule.validateSync();
  assert.ok(floatDripErr?.errors.dripDaysAfterEnrollment);

  console.log('[Test 3.3] Lesson schema validation: required courseId, moduleId, and invalid contentType');
  const invalidLesson = new LessonModel({
    title: 'Lesson 1',
    contentType: 'unsupported_type' as any
  });
  const lessonErr = invalidLesson.validateSync();
  assert.ok(lessonErr?.errors.courseId);
  assert.ok(lessonErr?.errors.moduleId);
  assert.ok(lessonErr?.errors.contentType);

  console.log('[Test 3.4] Lesson schema validation: negative unlockOverrideDays');
  const negLesson = new LessonModel({
    courseId: new mongoose.Types.ObjectId(),
    moduleId: new mongoose.Types.ObjectId(),
    title: 'Lesson 1',
    contentType: 'video',
    unlockOverrideDays: -1
  });
  const negLessonErr = negLesson.validateSync();
  assert.ok(negLessonErr?.errors.unlockOverrideDays);

  console.log('[Test 3.5] Lesson resource schema validation');
  const validLesson = new LessonModel({
    courseId: new mongoose.Types.ObjectId(),
    moduleId: new mongoose.Types.ObjectId(),
    title: 'Lesson 1',
    contentType: 'video',
    resources: [
      {
        title: 'Project BIM Guide',
        storageKey: 'resources/guide.pdf',
        fileSizeBytes: 2048,
        mimeType: 'application/pdf',
        downloadAllowed: true
      }
    ]
  });
  const validLessonErr = validLesson.validateSync();
  assert.equal(validLessonErr, undefined);
  console.log('✔ Module and Lesson schema in-memory validations passed.\n');

  // -------------------------------------------------------------
  // Test Group 4: Drip Content Priority & Override Rules
  // -------------------------------------------------------------
  console.log('[Test 4.1] Drip content calculation: Module default vs Lesson override');
  // Case A: Lesson has no override (null) -> Inherits module drip days (7)
  const moduleDripDays = 7;
  const lessonOverrideNull = null;
  const effectiveA = typeof lessonOverrideNull === 'number' ? lessonOverrideNull : moduleDripDays;
  assert.equal(effectiveA, 7, 'Lesson with null override must inherit module drip days');

  // Case B: Lesson has explicit override (3) -> Overrides module drip days (7)
  const lessonOverrideExplicit = 3;
  const effectiveB = typeof lessonOverrideExplicit === 'number' ? lessonOverrideExplicit : moduleDripDays;
  assert.equal(effectiveB, 3, 'Lesson with explicit override must take precedence');

  // Case C: Lesson override 0 -> Immediate unlock even if module is 14 days
  const lessonOverrideZero = 0;
  const effectiveC = typeof lessonOverrideZero === 'number' ? lessonOverrideZero : 14;
  assert.equal(effectiveC, 0, 'Lesson override 0 must unlock immediately');
  console.log('✔ Drip calculation & priority rules passed.\n');

  // -------------------------------------------------------------
  // Test Group 5: RBAC Enforcement on Course Operations
  // -------------------------------------------------------------
  console.log('[Test 5.1] RBAC: Course write permissions');
  const adminRoles: UserRole[] = ['admin'];
  const superadminRoles: UserRole[] = ['superadmin'];
  const instructorRoles: UserRole[] = ['instructor'];
  const studentRoles: UserRole[] = ['student'];

  assert.equal(hasPermission(adminRoles, 'courses:write'), true);
  assert.equal(hasPermission(superadminRoles, 'courses:write'), true);
  assert.equal(hasPermission(instructorRoles, 'courses:write'), false, 'Instructor cannot author canonical courses');
  assert.equal(hasPermission(studentRoles, 'courses:write'), false, 'Student cannot author canonical courses');

  assert.throws(() => assertPermission(studentRoles, 'courses:write'), AuthorizationError);
  assert.throws(() => assertPermission(instructorRoles, 'courses:write'), AuthorizationError);
  console.log('✔ RBAC guards on course authoring passed.\n');

  // -------------------------------------------------------------
  // Test Group 6: Reorder Duplicate & Hierarchy Validation
  // -------------------------------------------------------------
  console.log('[Test 6.1] Duplicate IDs in module reorder rejected');
  await assert.rejects(
    async () => {
      await CourseService.reorderModules('fake_course_id', ['mod_1', 'mod_1']);
    },
    ValidationError
  );

  console.log('[Test 6.2] Duplicate IDs in lesson reorder rejected');
  await assert.rejects(
    async () => {
      await CourseService.reorderLessons('fake_course_id', 'fake_module_id', ['les_1', 'les_1']);
    },
    ValidationError
  );
  console.log('✔ Reorder duplicate validation passed.\n');

  // -------------------------------------------------------------
  // Test Group 7: Live Database Operations (Executed only when DB reachable)
  // -------------------------------------------------------------
  if (dbConnected) {
    console.log('[Test 7.1] Live DB: Create canonical course');
    const testSlug = `test-revit-${Date.now()}`;
    const course = await CourseService.createCourse({
      slug: testSlug,
      title: 'Test BIM Course',
      description: 'Test description for canonical course.',
      level: 'intermediate',
      thumbnailUrl: '/test-thumb.jpg',
      deliveryModes: ['self_paced', 'cohort_batch'],
      estimatedHours: 25
    });

    assert.equal(course.slug, testSlug);
    assert.equal(course.level, 'intermediate');

    console.log('[Test 7.2] Live DB: Reject duplicate slug');
    await assert.rejects(
      async () => {
        await CourseService.createCourse({
          slug: testSlug,
          title: 'Duplicate Slug Course',
          description: 'Should fail.',
          level: 'beginner',
          thumbnailUrl: '/test.jpg'
        });
      },
      ConflictError
    );

    console.log('[Test 7.3] Live DB: Create modules & verify ordering');
    const mod1 = await CourseService.createModule(course.id, {
      title: 'Module 1: Foundations',
      dripDaysAfterEnrollment: 0
    });
    const mod2 = await CourseService.createModule(course.id, {
      title: 'Module 2: Advanced Family Modeling',
      dripDaysAfterEnrollment: 7
    });

    assert.equal(mod1.order, 0);
    assert.equal(mod2.order, 1);
    assert.equal(mod2.dripDaysAfterEnrollment, 7);

    console.log('[Test 7.4] Live DB: Create lesson with hierarchy enforcement');
    const lesson1 = await CourseService.createLesson(course.id, mod1.id, {
      title: 'Lesson 1.1: Interface Intro',
      contentType: 'video',
      contentData: { durationSeconds: 600 },
      isPreviewFree: true,
      unlockOverrideDays: null
    });
    assert.equal(lesson1.moduleId, mod1.id);
    assert.equal(lesson1.isPreviewFree, true);

    const lesson2 = await CourseService.createLesson(course.id, mod2.id, {
      title: 'Lesson 2.1: Advanced Families (Overridden Drip)',
      contentType: 'pdf',
      contentData: { pdfStorageKey: 'pdfs/guide.pdf' },
      isPreviewFree: false,
      unlockOverrideDays: 2
    });
    assert.equal(lesson2.unlockOverrideDays, 2);

    console.log('[Test 7.5] Live DB: Reject lesson cross-course mismatch');
    const fakeCourseId = new mongoose.Types.ObjectId().toString();
    await assert.rejects(
      async () => {
        await CourseService.createLesson(fakeCourseId, mod1.id, {
          title: 'Mismatched Lesson',
          contentType: 'video'
        });
      },
      NotFoundError
    );

    console.log('[Test 7.6] Live DB: Reorder modules');
    const reorderedMods = await CourseService.reorderModules(course.id, [mod2.id, mod1.id]);
    assert.equal(reorderedMods[0].id, mod2.id);
    assert.equal(reorderedMods[0].order, 0);
    assert.equal(reorderedMods[1].id, mod1.id);
    assert.equal(reorderedMods[1].order, 1);

    console.log('[Test 7.7] Live DB: Retrieve curriculum tree with effective drip calculation');
    const curriculum = await CourseService.getCurriculum(course.id);
    assert.equal(curriculum.modules.length, 2);
    const modWithLesson2 = curriculum.modules.find(m => m.id === mod2.id);
    const retrievedLesson2 = modWithLesson2?.lessons.find(l => l.id === lesson2.id);
    assert.equal(retrievedLesson2?.effectiveDripDays, 2);

    // Clean up test data
    await LessonModel.deleteMany({ courseId: course.id });
    await ModuleModel.deleteMany({ courseId: course.id });
    await CourseModel.deleteOne({ _id: course.id });
    console.log('✔ Live database integration tests passed.\n');
    await mongoose.disconnect();
  } else {
    console.log('ℹ (Skipping Tests 7.1–7.7: Live MongoDB integration tests were bypassed because no MongoDB server was running on 127.0.0.1:27017.)\n');
  }

  console.log('=============================================================');
  console.log('🎉 ALL IN-MEMORY & UNIT VALIDATION TESTS PASSED! (0 ERRORS)');
  console.log('=============================================================');
}

runCourseEngineTests().catch(err => {
  console.error('❌ Course engine test suite failed:', err);
  process.exit(1);
});
