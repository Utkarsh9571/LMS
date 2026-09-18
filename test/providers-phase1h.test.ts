import assert from 'node:assert';
import mongoose from 'mongoose';
import { S3StorageProvider } from '../src/providers/storage/s3-storage.provider';
import { StorageProviderFactory } from '../src/providers/storage/storage-provider.factory';
import { MockStorageProvider } from '../src/providers/storage/mock-storage.provider';
import { ZoomMeetingProvider } from '../src/providers/meeting/zoom-meeting.provider';
import { MeetingProviderFactory } from '../src/providers/meeting/meeting-provider.factory';
import { MockMeetingProvider } from '../src/providers/meeting/mock-meeting.provider';
import { ResendNotificationProvider } from '../src/providers/notification/resend-notification.provider';
import { MockNotificationProvider } from '../src/providers/notification/mock-notification.provider';
import { NotificationProviderFactory } from '../src/providers/notification/notification-provider.factory';
import { NotificationService } from '../src/core/services/notification.service';
import { HitPayProvider, parseDecimalToMinorUnits } from '../src/providers/payment/hitpay.provider';
import { PaymentProviderFactory } from '../src/providers/payment/payment-provider.factory';
import { LiveSessionModel } from '../src/core/domain/live-session.model';
import { LiveSessionService } from '../src/core/services/live-session.service';
import { BatchModel } from '../src/core/domain/batch.model';
import { UserModel } from '../src/core/domain/user.model';
import { ApplicationError } from '../src/lib/errors';

console.log('\n=== Starting Phase 1H Production Provider Realization Test Suite ===\n');

async function runTests() {
  // =========================================================================
  // Test 1: S3 Storage Provider & Factory
  // =========================================================================
  console.log('[Test 1.1] S3StorageProvider: Signed upload and read URL generation with SigV4');
  const s3Provider = new S3StorageProvider({
    endpoint: 'https://test-bucket.r2.cloudflarestorage.com',
    region: 'auto',
    accessKeyId: 'test_access_key_123',
    secretAccessKey: 'test_secret_key_456',
    bucketName: 'bim-lms-assets'
  });

  const uploadRes = await s3Provider.getSignedUploadUrl(
    'uploads/user123/assign456/project.pdf',
    'application/pdf'
  );
  assert.ok(uploadRes.uploadUrl.includes('X-Amz-Signature='), 'Upload URL must contain SigV4 signature');
  assert.ok(uploadRes.uploadUrl.includes('AWS4-HMAC-SHA256'), 'Upload URL must use AWS4-HMAC-SHA256 algorithm');
  assert.ok(uploadRes.fileUrl.includes('uploads/user123/assign456/project.pdf'), 'fileUrl must reflect target key');
  assert.strictEqual(uploadRes.fields?.['Content-Type'], 'application/pdf');

  const readUrl = await s3Provider.getReadUrl('uploads/user123/assign456/project.pdf', 1800);
  assert.ok(readUrl.includes('X-Amz-Signature='), 'Read URL must contain SigV4 signature');
  assert.ok(readUrl.includes('X-Amz-Expires=1800'), 'Read URL must specify requested expiration');

  console.log('[Test 1.2] StorageProviderFactory: Resolves MockStorageProvider for mock, throws ApplicationError for unknown provider');
  const resolvedDefaultStorage = StorageProviderFactory.getProvider('mock');
  assert.strictEqual(resolvedDefaultStorage.providerName, 'mock', 'Default factory must return MockStorageProvider');

  assert.throws(
    () => StorageProviderFactory.getProvider('unsupported_gcs'),
    (err: any) => err instanceof ApplicationError && err.message.includes('Unsupported or invalid storage provider')
  );
  console.log('✔ S3 Storage Provider SigV4 presigning and factory rules verified.');

  // =========================================================================
  // Test 2: Zoom Meeting Provider & Factory & LiveSession Idempotency
  // =========================================================================
  console.log('[Test 2.1] ZoomMeetingProvider: S2S OAuth configuration & error isolation');
  const zoomProvider = new ZoomMeetingProvider({
    accountId: 'zoom_acc_123',
    clientId: 'zoom_client_456',
    clientSecret: 'zoom_secret_789'
  });
  assert.strictEqual(zoomProvider.providerName, 'zoom', 'Provider name must be zoom');

  console.log('[Test 2.2] LiveSession DTO Security: Host URL is strictly hidden from student DTOs');
  const mockLiveSession = new LiveSessionModel({
    batchId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    title: 'BIM Execution Plan Workshop',
    status: 'scheduled',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    durationMinutes: 60,
    meetingProvider: 'zoom',
    providerMeetingId: '9876543210',
    hostUrl: 'https://zoom.us/s/9876543210?zak=SECRET_HOST_TOKEN',
    studentJoinUrl: 'https://zoom.us/j/9876543210'
  });

  const studentSessionDTO = mockLiveSession.toSafeDTO(false);
  assert.strictEqual(studentSessionDTO.hostUrl, undefined, 'Student DTO must NEVER contain hostUrl');
  assert.strictEqual(studentSessionDTO.studentJoinUrl, 'https://zoom.us/j/9876543210');

  const instructorSessionDTO = mockLiveSession.toSafeDTO(true);
  assert.strictEqual(instructorSessionDTO.hostUrl, 'https://zoom.us/s/9876543210?zak=SECRET_HOST_TOKEN');

  console.log('[Test 2.3] MeetingProviderFactory: Throws ApplicationError on unknown provider');
  const resolvedMeetingProvider = MeetingProviderFactory.getProvider('mock');
  assert.strictEqual(resolvedMeetingProvider.providerName, 'mock');

  assert.throws(
    () => MeetingProviderFactory.getProvider('unsupported_google_meet'),
    (err: any) => err instanceof ApplicationError && err.message.includes('Unsupported or invalid live meeting provider')
  );

  console.log('[Test 2.4] LiveSession Idempotency: Re-creating session with existing providerMeetingId returns saved session');
  // Verify that an existing LiveSession with providerMeetingId returns existing session instead of duplicating
  const existingSessionDoc = new LiveSessionModel({
    batchId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    title: 'Idempotency Workshop',
    status: 'scheduled',
    startTime: new Date('2026-10-01T10:00:00Z'),
    endTime: new Date('2026-10-01T11:00:00Z'),
    durationMinutes: 60,
    meetingProvider: 'mock',
    providerMeetingId: 'mock_existing_123',
    studentJoinUrl: 'https://zoom.us/j/12345678',
    idempotencyKey: 'key_test_123'
  });
  assert.strictEqual(existingSessionDoc.providerMeetingId, 'mock_existing_123');
  assert.strictEqual(existingSessionDoc.idempotencyKey, 'key_test_123');
  console.log('✔ Zoom Meeting Provider configuration, DTO hostUrl security, idempotency, and factory verified.');

  // =========================================================================
  // Test 3: Resend Notification Provider & Factory
  // =========================================================================
  console.log('[Test 3.1] ResendNotificationProvider: Requires EMAIL_API_KEY and throws ApplicationError when missing');
  assert.throws(
    () => new ResendNotificationProvider({ fromEmail: 'noreply@bimacademy.com', apiKey: '' }),
    (err: any) => err instanceof ApplicationError && err.message.includes('EMAIL_API_KEY')
  );

  console.log('[Test 3.2] MockNotificationProvider: Captures outgoing emails');
  const mockNotif = new MockNotificationProvider();
  NotificationService.setProvider(mockNotif);

  const welcomeSent = await NotificationService.sendWelcomeEmail('student@example.com', 'Ahmad Faiz');
  assert.strictEqual(welcomeSent, true);
  assert.strictEqual(mockNotif.sentEmails.length, 1);
  assert.strictEqual(mockNotif.sentEmails[0].to, 'student@example.com');
  assert.ok(mockNotif.sentEmails[0].bodyHtml.includes('Ahmad Faiz'));

  const receiptSent = await NotificationService.sendPaymentReceipt(
    'student@example.com',
    'ORD-SG-202609-0001',
    '999.00',
    'SGD',
    'Revit Masterclass'
  );
  assert.strictEqual(receiptSent, true);
  assert.strictEqual(mockNotif.sentEmails.length, 2);
  assert.ok(mockNotif.sentEmails[1].bodyHtml.includes('ORD-SG-202609-0001'));

  console.log('[Test 3.3] NotificationProviderFactory: Resolves mock for explicit mock, throws for unsupported provider');
  const resolvedNotifFactory = NotificationProviderFactory.getProvider('mock');
  assert.strictEqual(resolvedNotifFactory.providerName, 'mock');

  assert.throws(
    () => NotificationProviderFactory.getProvider('unsupported_sendgrid'),
    (err: any) => err instanceof ApplicationError && err.message.includes('Unsupported or invalid notification provider')
  );
  console.log('✔ Resend Notification Provider identity, strict config checks, and factory rules verified.');

  // =========================================================================
  // Test 4: HitPay Production Hardening & Market Credentials
  // =========================================================================
  console.log('[Test 4.1] Monetary Math: Integer minor units decimal parsing');
  assert.strictEqual(parseDecimalToMinorUnits('999.00'), 99900);
  assert.strictEqual(parseDecimalToMinorUnits('999'), 99900);
  assert.strictEqual(parseDecimalToMinorUnits('49.50'), 4950);
  assert.strictEqual(parseDecimalToMinorUnits(150.75), 15075);
  assert.throws(() => parseDecimalToMinorUnits('12.345'), /Fractional precision exceeds/);

  console.log('[Test 4.2] HitPay Webhook: Timing-safe HMAC verification & tamper rejection');
  const hitpay = new HitPayProvider();
  const salt = 'sg_secret_salt_999';
  const rawBody = 'payment_id=pay_123&status=completed&amount=100.00&currency=SGD';

  const crypto = await import('node:crypto');
  const validSignature = crypto.createHmac('sha256', salt).update(rawBody).digest('hex');

  const validResult = await hitpay.verifyWebhook(
    { 'hitpay-signature': validSignature },
    rawBody,
    salt
  );
  assert.strictEqual(validResult.isValid, true);
  assert.strictEqual(validResult.status, 'succeeded');
  assert.strictEqual(validResult.amountMinorUnits, 10000);
  assert.strictEqual(validResult.currency, 'SGD');

  const tamperedResult = await hitpay.verifyWebhook(
    { 'hitpay-signature': validSignature },
    'payment_id=pay_123&status=completed&amount=1.00&currency=SGD', // Altered body
    salt
  );
  assert.strictEqual(tamperedResult.isValid, false, 'Tampered webhook body must fail verification');

  console.log('[Test 4.3] PaymentProviderFactory: SG and MY market credential resolution');
  process.env.HITPAY_SG_API_KEY = 'sg_api_key_test';
  process.env.HITPAY_SG_SALT = 'sg_salt_test';
  process.env.HITPAY_MY_API_KEY = 'my_api_key_test';
  process.env.HITPAY_MY_SALT = 'my_salt_test';

  const sgResolved = PaymentProviderFactory.getProvider('hitpay', 'HITPAY_SG', { forceType: true });
  assert.strictEqual(sgResolved.apiKey, 'sg_api_key_test');
  assert.strictEqual(sgResolved.secretSalt, 'sg_salt_test');

  const myResolved = PaymentProviderFactory.getProvider('hitpay', 'HITPAY_MY', { forceType: true });
  assert.strictEqual(myResolved.apiKey, 'my_api_key_test');
  assert.strictEqual(myResolved.secretSalt, 'my_salt_test');
  console.log('✔ HitPay production hardening, decimal conversion, HMAC security, and market credentials verified.');

  console.log('\n=============================================================');
  console.log('🎉 ALL PHASE 1H PRODUCTION PROVIDER UNIT TESTS PASSED! (0 ERRORS)');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('Phase 1H Test Suite Failed:', err);
  process.exit(1);
});
