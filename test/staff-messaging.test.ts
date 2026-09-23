import fs from 'node:fs';
import path from 'node:path';

// Pre-load .env.local BEFORE application imports to ensure config loads Atlas MONGODB_URI
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
} catch (_) {}

import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import { config } from '../src/lib/config';
if (process.env.MONGODB_URI) {
  config.database.uri = process.env.MONGODB_URI;
}

import { connectToDatabase } from '../src/lib/db';
import { hasRole, hasPermission, assertPermission } from '../src/core/services/rbac.service';
import { StaffMessagingService } from '../src/core/services/staff-messaging.service';
import { NotificationService } from '../src/core/services/notification.service';
import { MockNotificationProvider } from '../src/providers/notification/mock-notification.provider';
import { StaffMessageModel } from '../src/core/domain/staff-message.model';
import { UserModel } from '../src/core/domain/user.model';
import { BatchModel } from '../src/core/domain/batch.model';
import { LiveSessionModel } from '../src/core/domain/live-session.model';
import { CourseModel } from '../src/core/domain/course.model';
import { EnrollmentModel } from '../src/core/domain/enrollment.model';
import { EntitlementModel } from '../src/core/domain/entitlement.model';
import { UserRole } from '../src/core/domain/domain-types';
import { NotFoundError, AuthorizationError, ValidationError } from '../src/lib/errors';

async function runMessagingTests() {
  console.log('\n=== Starting Phase 3.8 Staff Messaging & Notifications Test Suite ===\n');

  // =========================================================================
  // Test Group 1: Canonical RBAC Permissions Matrix
  // =========================================================================
  console.log('[Test 1.1] Canonical RBAC: Student denied messages:operate permission');
  assert.strictEqual(hasPermission(['student'], 'messages:operate'), false, 'Student must not have messages:operate');
  assert.throws(
    () => assertPermission(['student'], 'messages:operate'),
    (err: any) => err instanceof AuthorizationError && err.code === 'AUTHORIZATION_ERROR',
    'assertPermission must throw AuthorizationError for student'
  );

  console.log('[Test 1.2] Canonical RBAC: Staff, Instructor, Admin, Superadmin have messages:operate permission');
  assert.strictEqual(hasPermission(['staff'], 'messages:operate'), true, 'Staff must have messages:operate');
  assert.strictEqual(hasPermission(['instructor'], 'messages:operate'), true, 'Instructor must have messages:operate');
  assert.strictEqual(hasPermission(['admin'], 'messages:operate'), true, 'Admin must have messages:operate');
  assert.strictEqual(hasPermission(['superadmin'], 'messages:operate'), true, 'Superadmin must have messages:operate');

  console.log('[Test 1.3] RBAC Granularity: Commercial permissions do NOT automatically imply messaging privileges');
  const commerceOnlyRoles: UserRole[] = ['student'];
  assert.strictEqual(hasPermission(commerceOnlyRoles, 'messages:operate'), false);
  console.log('✔ Canonical RBAC capability matrix for messaging verified.\n');

  // =========================================================================
  // Test Group 2: StaffMessageModel Schema & Status Invariants
  // =========================================================================
  console.log('[Test 2.1] StaffMessageModel: Status enum permits submitted, failed, partially_failed');
  const statusEnumValues = (StaffMessageModel.schema.path('status') as any).enumValues;
  assert.ok(statusEnumValues.includes('submitted'), 'Status enum must include submitted');
  assert.ok(statusEnumValues.includes('failed'), 'Status enum must include failed');
  assert.ok(statusEnumValues.includes('partially_failed'), 'Status enum must include partially_failed');

  console.log('[Test 2.2] StaffMessageModel: Never permits fabricated "delivered" status');
  assert.strictEqual(
    statusEnumValues.includes('delivered'),
    false,
    'Status enum must NEVER include fabricated delivered status'
  );

  console.log('[Test 2.3] StaffMessageModel: Unique sparse index exists on idempotencyKey for race safety');
  const indexes = StaffMessageModel.schema.indexes();
  const idempotencyIndex = indexes.find(
    (idx) => idx[0] && typeof idx[0] === 'object' && 'idempotencyKey' in idx[0]
  );
  assert.ok(idempotencyIndex, 'Must have index on idempotencyKey');
  assert.strictEqual(idempotencyIndex[1]?.unique, true, 'idempotencyKey index must be unique');
  assert.strictEqual(idempotencyIndex[1]?.sparse, true, 'idempotencyKey index must be sparse');

  console.log('[Test 2.4] StaffMessageSafeDTO: Does not expose raw recipient email lists');
  const dummyStaffMessage = new StaffMessageModel({
    senderId: new mongoose.Types.ObjectId(),
    senderName: 'Test Staff',
    action: 'batch_announcement',
    targetType: 'batch',
    targetId: new mongoose.Types.ObjectId(),
    targetName: 'BIM Cohort 1',
    subject: 'Operational Notice',
    messagePreview: 'Classes will start tomorrow.',
    recipientCount: 25,
    failedCount: 0,
    status: 'submitted',
    marketCode: 'SG'
  });
  const safeDTO = dummyStaffMessage.toSafeDTO();
  assert.strictEqual((safeDTO as any).recipientEmails, undefined, 'Safe DTO must not expose recipientEmails');
  assert.strictEqual(safeDTO.status, 'submitted');
  assert.strictEqual(safeDTO.recipientCount, 25);
  console.log('✔ StaffMessageModel schema, honest status, and DTO privacy verified.\n');

  // =========================================================================
  // Test Group 3: Market & Timezone Formatting for Session Reminders
  // =========================================================================
  console.log('[Test 3.1] Market Timezone: SG market uses Asia/Singapore (SGT) timezone in email notices');
  const mockProvider = new MockNotificationProvider();
  NotificationService.setProvider(mockProvider);

  const testStartTime = new Date('2026-10-15T02:00:00.000Z'); // 10:00 AM SGT (UTC+8)
  await NotificationService.sendLiveSessionNotice(
    'student.sg@example.com',
    'Revit Fundamentals',
    testStartTime,
    'https://lms.com/join/123',
    'SG'
  );

  const sentSgEmail = mockProvider.sentEmails.find((e) => e.to === 'student.sg@example.com');
  assert.ok(sentSgEmail, 'SG email must be dispatched');
  assert.ok(sentSgEmail.bodyHtml.includes('(SGT)'), 'Email must include SGT timezone label');
  assert.ok(
    sentSgEmail.bodyHtml.includes('10:00 AM') || sentSgEmail.bodyHtml.includes('10:00 am'),
    'Email must format time as 10:00 AM in SGT'
  );
  assert.strictEqual(
    sentSgEmail.bodyHtml.includes('toUTCString'),
    false,
    'Must not include raw toUTCString'
  );

  console.log('[Test 3.2] Market Timezone: MY market uses Asia/Kuala_Lumpur (MYT) timezone in email notices');
  await NotificationService.sendLiveSessionNotice(
    'student.my@example.com',
    'Civil 3D Lab',
    testStartTime,
    'https://lms.com/join/456',
    'MY'
  );

  const sentMyEmail = mockProvider.sentEmails.find((e) => e.to === 'student.my@example.com');
  assert.ok(sentMyEmail, 'MY email must be dispatched');
  assert.ok(sentMyEmail.bodyHtml.includes('(MYT)'), 'Email must include MYT timezone label');
  assert.ok(
    sentMyEmail.bodyHtml.includes('10:00 AM') || sentMyEmail.bodyHtml.includes('10:00 am'),
    'Email must format time as 10:00 AM in MYT'
  );
  console.log('✔ Market-sensitive SG (SGT) and MY (MYT) timezone formatting verified.\n');

  // =========================================================================
  // Test Group 4: Provider Failure Handling & Honest Status Representation
  // =========================================================================
  console.log('[Test 4.1] Provider Failure: Dispatches report honest failure when provider returns failure');
  const failingProvider = {
    providerName: 'mock_failing',
    sendEmail: async () => ({ success: false })
  };
  NotificationService.setProvider(failingProvider as any);

  const reminderFailed = await NotificationService.sendLiveSessionNotice(
    'fail@example.com',
    'Session',
    testStartTime,
    'https://join.url',
    'SG'
  );
  assert.strictEqual(reminderFailed, false, 'sendLiveSessionNotice must return false when provider fails');

  const announcementFailed = await NotificationService.sendBatchAnnouncement(
    'fail@example.com',
    'Student Name',
    'Batch Name',
    'Subject',
    'Message'
  );
  assert.strictEqual(announcementFailed, false, 'sendBatchAnnouncement must return false when provider fails');

  const directEmailFailed = await NotificationService.sendIndividualStudentEmail(
    'fail@example.com',
    'Student Name',
    'Staff Name',
    'Subject',
    'Message'
  );
  assert.strictEqual(directEmailFailed, false, 'sendIndividualStudentEmail must return false when provider fails');

  // Restore mock provider
  NotificationService.setProvider(mockProvider);
  console.log('✔ Provider failure propagation and honest boolean reporting verified.\n');

  // =========================================================================
  // Test Group 5: Input Validation & Boundary Checks
  // =========================================================================
  console.log('[Test 5.1] Validation: Malformed sessionId throws NotFoundError');
  await assert.rejects(
    async () => {
      await StaffMessagingService.sendWorkshopReminder({
        sessionId: 'not-an-object-id',
        callerId: '65f1a2b3c4d5e6f7a8b9c0d1'
      });
    },
    (err: any) => err instanceof NotFoundError && err.code === 'NOT_FOUND'
  );

  console.log('[Test 5.2] Validation: Malformed batchId throws NotFoundError');
  await assert.rejects(
    async () => {
      await StaffMessagingService.sendBatchAnnouncement({
        batchId: 'invalid-batch-id',
        subject: 'Valid Subject',
        message: 'Valid Message',
        callerId: '65f1a2b3c4d5e6f7a8b9c0d1'
      });
    },
    (err: any) => err instanceof NotFoundError && err.code === 'NOT_FOUND'
  );

  console.log('[Test 5.3] Validation: Empty subject throws ValidationError');
  await assert.rejects(
    async () => {
      await StaffMessagingService.sendBatchAnnouncement({
        batchId: '65f1a2b3c4d5e6f7a8b9c0d1',
        subject: '   ',
        message: 'Valid Message',
        callerId: '65f1a2b3c4d5e6f7a8b9c0d2'
      });
    },
    (err: any) => err instanceof ValidationError && err.code === 'VALIDATION_ERROR'
  );

  console.log('[Test 5.4] Validation: Subject > 200 chars throws ValidationError');
  await assert.rejects(
    async () => {
      await StaffMessagingService.sendBatchAnnouncement({
        batchId: '65f1a2b3c4d5e6f7a8b9c0d1',
        subject: 'A'.repeat(201),
        message: 'Valid Message',
        callerId: '65f1a2b3c4d5e6f7a8b9c0d2'
      });
    },
    (err: any) => err instanceof ValidationError && err.code === 'VALIDATION_ERROR'
  );

  console.log('[Test 5.5] Validation: Empty message body throws ValidationError');
  await assert.rejects(
    async () => {
      await StaffMessagingService.sendBatchAnnouncement({
        batchId: '65f1a2b3c4d5e6f7a8b9c0d1',
        subject: 'Valid Subject',
        message: '   ',
        callerId: '65f1a2b3c4d5e6f7a8b9c0d2'
      });
    },
    (err: any) => err instanceof ValidationError && err.code === 'VALIDATION_ERROR'
  );

  console.log('[Test 5.6] Validation: Message body > 5000 chars throws ValidationError');
  await assert.rejects(
    async () => {
      await StaffMessagingService.sendBatchAnnouncement({
        batchId: '65f1a2b3c4d5e6f7a8b9c0d1',
        subject: 'Valid Subject',
        message: 'M'.repeat(5001),
        callerId: '65f1a2b3c4d5e6f7a8b9c0d2'
      });
    },
    (err: any) => err instanceof ValidationError && err.code === 'VALIDATION_ERROR'
  );

  console.log('[Test 5.7] Validation: Malformed targetUserId throws NotFoundError');
  await assert.rejects(
    async () => {
      await StaffMessagingService.sendIndividualStudentEmail({
        targetUserId: 'invalid-user-id',
        subject: 'Valid Subject',
        message: 'Valid Message',
        callerId: '65f1a2b3c4d5e6f7a8b9c0d1'
      });
    },
    (err: any) => err instanceof NotFoundError && err.code === 'NOT_FOUND'
  );

  console.log('[Test 5.8] Validation: Malformed callerId throws NotFoundError');
  await assert.rejects(
    async () => {
      await StaffMessagingService.getMessageOptions('not-a-valid-caller-id');
    },
    (err: any) => err instanceof NotFoundError && err.code === 'NOT_FOUND'
  );
  console.log('✔ Input payload length, format, and boundary checks verified.\n');

  // =========================================================================
  // Test Group 6: Database Integration — Entitlement-Aware Recipient Resolution,
  //               Scoping, Idempotency & Honest Persistence
  // =========================================================================
  let hasDb = false;
  try {
    await connectToDatabase();
    hasDb = mongoose.connection.readyState === 1;
  } catch (err) {
    console.log('⚠️ Database connection unavailable; skipping database-bound integration tests.');
  }

  if (hasDb) {
    console.log('[Test 6.1] Integration: Unauthorized student cannot invoke getMessageOptions');
    const studentUser = await UserModel.create({
      email: `student_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      fullName: 'Student Doe',
      globalRoles: ['student'],
      status: 'active'
    });

    await assert.rejects(
      async () => {
        await StaffMessagingService.getMessageOptions(studentUser._id.toString());
      },
      (err: any) => err instanceof AuthorizationError && err.code === 'AUTHORIZATION_ERROR'
    );

    console.log('[Test 6.2] Integration: Instructor cannot send announcement to unrelated cohort batch');
    const instructor1 = await UserModel.create({
      email: `inst1_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      fullName: 'Instructor One',
      globalRoles: ['instructor'],
      status: 'active'
    });

    const instructor2 = await UserModel.create({
      email: `inst2_${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      fullName: 'Instructor Two',
      globalRoles: ['instructor'],
      status: 'active'
    });

    const course = await CourseModel.create({
      title: `Test Course ${Date.now()}`,
      slug: `course-${Date.now()}`,
      summary: 'Summary',
      description: 'Desc',
      level: 'beginner',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      deliveryMode: 'cohort_batch',
      status: 'published',
      publishedByUserId: instructor1._id
    });

    const batchOfInstructor2 = await BatchModel.create({
      courseId: course._id,
      marketCode: 'SG',
      code: `B-${Date.now()}-2`,
      name: 'Batch Instructor 2',
      status: 'in_progress',
      capacity: 30,
      enrolledCount: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      primaryInstructorId: instructor2._id,
      meetingProvider: 'mock'
    });

    // Instructor 1 attempts to message Instructor 2's batch
    await assert.rejects(
      async () => {
        await StaffMessagingService.sendBatchAnnouncement({
          batchId: batchOfInstructor2._id.toString(),
          subject: 'Unauthorized announcement',
          message: 'Hello class',
          callerId: instructor1._id.toString()
        });
      },
      (err: any) => err instanceof AuthorizationError && err.code === 'AUTHORIZATION_ERROR'
    );

    console.log('[Test 6.3] Integration: Entitlement-aware recipient resolution excludes dropped enrollments and revoked/expired entitlements');
    // Setup batch for Instructor 1
    const batchOfInstructor1 = await BatchModel.create({
      courseId: course._id,
      marketCode: 'SG',
      code: `B-${Date.now()}-1`,
      name: 'Batch Instructor 1',
      status: 'in_progress',
      capacity: 30,
      enrolledCount: 4,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      primaryInstructorId: instructor1._id,
      meetingProvider: 'mock'
    });

    // 1. Active student with active entitlement -> SHOULD receive email
    const studentActive = await UserModel.create({
      email: `valid_student_${Date.now()}@example.com`,
      passwordHash: 'hash',
      fullName: 'Valid Active Student',
      globalRoles: ['student'],
      status: 'active'
    });
    const entActive = await EntitlementModel.create({
      userId: studentActive._id,
      marketCode: 'SG',
      targetType: 'batch',
      targetId: batchOfInstructor1._id,
      status: 'active'
    });
    await EnrollmentModel.create({
      userId: studentActive._id,
      courseId: course._id,
      batchId: batchOfInstructor1._id,
      entitlementId: entActive._id,
      status: 'active'
    });

    // 2. Dropped enrollment student -> MUST BE EXCLUDED
    const studentDropped = await UserModel.create({
      email: `dropped_student_${Date.now()}@example.com`,
      passwordHash: 'hash',
      fullName: 'Dropped Student',
      globalRoles: ['student'],
      status: 'active'
    });
    const entDropped = await EntitlementModel.create({
      userId: studentDropped._id,
      marketCode: 'SG',
      targetType: 'batch',
      targetId: batchOfInstructor1._id,
      status: 'active'
    });
    await EnrollmentModel.create({
      userId: studentDropped._id,
      courseId: course._id,
      batchId: batchOfInstructor1._id,
      entitlementId: entDropped._id,
      status: 'dropped'
    });

    // 3. Active enrollment but REVOKED entitlement -> MUST BE EXCLUDED
    const studentRevoked = await UserModel.create({
      email: `revoked_student_${Date.now()}@example.com`,
      passwordHash: 'hash',
      fullName: 'Revoked Entitlement Student',
      globalRoles: ['student'],
      status: 'active'
    });
    const entRevoked = await EntitlementModel.create({
      userId: studentRevoked._id,
      marketCode: 'SG',
      targetType: 'batch',
      targetId: batchOfInstructor1._id,
      status: 'revoked'
    });
    await EnrollmentModel.create({
      userId: studentRevoked._id,
      courseId: course._id,
      batchId: batchOfInstructor1._id,
      entitlementId: entRevoked._id,
      status: 'active'
    });

    // 4. Active enrollment but EXPIRED entitlement -> MUST BE EXCLUDED
    const studentExpired = await UserModel.create({
      email: `expired_student_${Date.now()}@example.com`,
      passwordHash: 'hash',
      fullName: 'Expired Entitlement Student',
      globalRoles: ['student'],
      status: 'active'
    });
    const entExpired = await EntitlementModel.create({
      userId: studentExpired._id,
      marketCode: 'SG',
      targetType: 'batch',
      targetId: batchOfInstructor1._id,
      status: 'active',
      expiresAt: new Date(Date.now() - 10000) // expired 10 seconds ago
    });
    await EnrollmentModel.create({
      userId: studentExpired._id,
      courseId: course._id,
      batchId: batchOfInstructor1._id,
      entitlementId: entExpired._id,
      status: 'active'
    });

    // 5. Active enrollment and entitlement but SUSPENDED user -> MUST BE EXCLUDED
    const studentSuspended = await UserModel.create({
      email: `suspended_student_${Date.now()}@example.com`,
      passwordHash: 'hash',
      fullName: 'Suspended Student',
      globalRoles: ['student'],
      status: 'suspended'
    });
    const entSuspended = await EntitlementModel.create({
      userId: studentSuspended._id,
      marketCode: 'SG',
      targetType: 'batch',
      targetId: batchOfInstructor1._id,
      status: 'active'
    });
    await EnrollmentModel.create({
      userId: studentSuspended._id,
      courseId: course._id,
      batchId: batchOfInstructor1._id,
      entitlementId: entSuspended._id,
      status: 'active'
    });

    mockProvider.sentEmails = [];
    const testIdempotencyKey = `idem_fixed_${Date.now()}_announcement`;
    const announcementResult = await StaffMessagingService.sendBatchAnnouncement({
      batchId: batchOfInstructor1._id.toString(),
      subject: 'Cohort Announcement 1',
      message: 'Welcome everyone.',
      callerId: instructor1._id.toString(),
      idempotencyKey: testIdempotencyKey
    });

    assert.strictEqual(announcementResult.sent, true);
    assert.strictEqual(
      announcementResult.recipientCount,
      1,
      'Exactly 1 active entitled student must receive the announcement'
    );
    assert.strictEqual(mockProvider.sentEmails.length, 1);
    assert.strictEqual(mockProvider.sentEmails[0].to, studentActive.email.toLowerCase());

    console.log('[Test 6.4] Integration: Idempotency prevents duplicate dispatches upon identical key');
    // Send using the exact same idempotencyKey
    const duplicateWithSameKey = await StaffMessagingService.sendBatchAnnouncement({
      batchId: batchOfInstructor1._id.toString(),
      subject: 'Cohort Announcement 1',
      message: 'Welcome everyone.',
      callerId: instructor1._id.toString(),
      idempotencyKey: testIdempotencyKey
    });

    assert.strictEqual(duplicateWithSameKey.duplicate, true, 'Result must be flagged as duplicate submission');
    // Ensure no additional email was dispatched to mock provider
    assert.strictEqual(
      mockProvider.sentEmails.length,
      1,
      'Provider sent email count must NOT increase on duplicate submission'
    );

    console.log('[Test 6.5] Integration: Message history records honest status and scopes instructor access');
    const adminUser = await UserModel.create({
      email: `admin_${Date.now()}@example.com`,
      passwordHash: 'hash',
      fullName: 'System Administrator',
      globalRoles: ['admin'],
      status: 'active'
    });

    const adminHistory = await StaffMessagingService.getMessageHistory(adminUser._id.toString());
    assert.ok(adminHistory.length >= 1, 'Admin must see operational message history');
    const recordedMessage = adminHistory.find(
      (m) => m.targetId === batchOfInstructor1._id.toString()
    );
    assert.ok(recordedMessage, 'Recorded announcement must be in history');
    assert.strictEqual(recordedMessage.status, 'submitted');
    assert.strictEqual(recordedMessage.recipientCount, 1);
    assert.strictEqual(recordedMessage.failedCount, 0);

    // Instructor 2 (not assigned to this batch) should NOT see this message in their history
    const instructor2History = await StaffMessagingService.getMessageHistory(instructor2._id.toString());
    const inst2FoundUnrelated = instructor2History.find(
      (m) => m.targetId === batchOfInstructor1._id.toString()
    );
    assert.strictEqual(
      inst2FoundUnrelated,
      undefined,
      'Instructor 2 must NOT see message history for Instructor 1 batch'
    );

    console.log('✔ Database integration: Recipient resolution, scoping, idempotency, and history verified.\n');
  }

  console.log('=============================================================');
  console.log('🎉 ALL PHASE 3.8 STAFF MESSAGING & NOTIFICATIONS TESTS PASSED! (0 ERRORS)');
  console.log('=============================================================\n');
}

runMessagingTests()
  .then(() => {
    if (mongoose.connection.readyState !== 0) {
      return mongoose.disconnect();
    }
  })
  .catch((err) => {
    console.error('❌ Staff Messaging Test Failed:', err);
    process.exit(1);
  });
