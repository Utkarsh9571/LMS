import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { UserModel, IUserDocument } from '@/core/domain/user.model';
import { BatchModel } from '@/core/domain/batch.model';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { EntitlementModel } from '@/core/domain/entitlement.model';
import { CourseModel } from '@/core/domain/course.model';
import { StaffMessageModel, IStaffMessageDocument } from '@/core/domain/staff-message.model';
import { NotificationService } from '@/core/services/notification.service';
import { hasPermission } from '@/core/services/rbac.service';
import { UserRole, StaffMessageStatus, IStaffMessageSafeDTO } from '@/core/domain/domain-types';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors';

export interface IMessageOptionsResponse {
  batches: Array<{
    id: string;
    name: string;
    batchCode: string;
    courseTitle: string;
    enrolledCount: number;
  }>;
  sessions: Array<{
    id: string;
    title: string;
    batchName: string;
    startTime: string;
    status: string;
    enrolledCount: number;
  }>;
  students: Array<{
    id: string;
    fullName: string;
    batchName: string;
  }>;
}

export interface IOperationalMessageResult {
  sent: boolean;
  recipientCount: number;
  failedCount: number;
  status: StaffMessageStatus;
  messageId: string;
  duplicate?: boolean;
  error?: string;
}

/**
 * Domain Staff Messaging Service
 *
 * Handles operational education-business communications:
 * 1. Workshop reminders with market-specific timezone formatting
 * 2. Cohort batch announcements to active entitled students
 * 3. Individual student operational emails with instructor-student scoping
 *
 * Invariants & Boundaries:
 * - Recipient resolution is strictly server-side, derived from active enrollments with valid active entitlements.
 * - Idempotency is database-enforced via unique sparse index on `idempotencyKey`.
 * - Application-level idempotency prevents duplicate application submissions, but cannot guarantee
 *   exactly-once external provider delivery if a network partition or crash occurs after provider dispatch.
 * - Delivery status reflects honest provider submission ('submitted', 'failed', 'partially_failed').
 *   Never fabricates a "delivered" status.
 */
export class StaffMessagingService {
  /**
   * Helper: Resolves active, entitled student recipients for a batch.
   * Enforces:
   * 1. Active enrollment in batch (status: 'active')
   * 2. Backing entitlement is status === 'active' AND isAccessValid(now)
   * 3. Target user status === 'active' (excludes suspended users)
   * 4. Deduplicates recipients by lowercase email
   */
  private static async resolveActiveBatchRecipients(
    batchId: mongoose.Types.ObjectId
  ): Promise<Array<{ user: IUserDocument; email: string }>> {
    const enrollments = await EnrollmentModel.find({ batchId, status: 'active' });
    if (enrollments.length === 0) return [];

    const entitlementIds = enrollments.map(e => e.entitlementId).filter(Boolean);
    const now = new Date();
    const activeEntitlements = await EntitlementModel.find({
      _id: { $in: entitlementIds },
      status: 'active'
    });

    const validEntitlementIdSet = new Set(
      activeEntitlements.filter(ent => ent.isAccessValid(now)).map(ent => ent._id.toString())
    );

    // Keep only enrollments with valid, active backing entitlement
    const validEnrollments = enrollments.filter(e => validEntitlementIdSet.has(e.entitlementId.toString()));
    if (validEnrollments.length === 0) return [];

    const userIds = Array.from(new Set(validEnrollments.map(e => e.userId.toString())));
    const users = await UserModel.find({ _id: { $in: userIds }, status: 'active' });

    // Deduplicate by normalized lowercase email
    const recipientMap = new Map<string, { user: IUserDocument; email: string }>();
    for (const u of users) {
      if (u.email && typeof u.email === 'string' && u.email.trim().length > 0) {
        const norm = u.email.trim().toLowerCase();
        if (!recipientMap.has(norm)) {
          recipientMap.set(norm, { user: u, email: norm });
        }
      }
    }

    return Array.from(recipientMap.values());
  }

  /**
   * Retrieves message options (authorized batches, sessions, and students) for staff dropdowns.
   * Privacy: Does not expose unnecessary student emails to client.
   */
  static async getMessageOptions(callerId: string): Promise<IMessageOptionsResponse> {
    const isCallerObjectId = /^[0-9a-fA-F]{24}$/.test(callerId);
    if (!isCallerObjectId) throw new NotFoundError('User', callerId);

    await connectToDatabase();

    const caller = await UserModel.findById(callerId);
    if (!caller) throw new NotFoundError('User', callerId);

    // Canonical RBAC permission check
    if (!hasPermission(caller.globalRoles, 'messages:operate')) {
      throw new AuthorizationError('Requires staff messaging privileges.');
    }

    const isGlobalAdmin = caller.globalRoles.some((r: UserRole) =>
      ['admin', 'superadmin', 'staff'].includes(r)
    );

    const batchQuery = isGlobalAdmin ? {} : { primaryInstructorId: caller._id };
    const batches = await BatchModel.find(batchQuery).sort({ createdAt: -1 });
    const batchIds = batches.map(b => b._id);
    const courseIds = Array.from(new Set(batches.map(b => b.courseId.toString())));

    const [courses, sessions] = await Promise.all([
      courseIds.length > 0 ? CourseModel.find({ _id: { $in: courseIds } }) : [],
      batchIds.length > 0 ? LiveSessionModel.find({ batchId: { $in: batchIds } }).sort({ startTime: -1 }) : []
    ]);

    const courseMap = new Map(courses.map(c => [c._id.toString(), c.title]));
    const batchMap = new Map(batches.map(b => [b._id.toString(), b.name]));

    // Resolve entitled active recipients for each batch to ensure accurate recipient counts
    const batchEnrollmentCountMap = new Map<string, number>();
    const studentList: IMessageOptionsResponse['students'] = [];
    const studentSeenSet = new Set<string>();

    for (const b of batches) {
      const activeRecipients = await this.resolveActiveBatchRecipients(b._id);
      batchEnrollmentCountMap.set(b._id.toString(), activeRecipients.length);

      for (const { user } of activeRecipients) {
        const key = `${user._id.toString()}:${b._id.toString()}`;
        if (!studentSeenSet.has(key)) {
          studentSeenSet.add(key);
          studentList.push({
            id: user._id.toString(),
            fullName: user.fullName,
            batchName: b.name
          });
        }
      }
    }

    return {
      batches: batches.map(b => ({
        id: b._id.toString(),
        name: b.name,
        batchCode: b.code,
        courseTitle: courseMap.get(b.courseId.toString()) || 'Course',
        enrolledCount: batchEnrollmentCountMap.get(b._id.toString()) || 0
      })),
      sessions: sessions.map(s => ({
        id: s._id.toString(),
        title: s.title,
        batchName: batchMap.get(s.batchId.toString()) || 'Batch',
        startTime: s.startTime.toISOString(),
        status: s.status,
        enrolledCount: batchEnrollmentCountMap.get(s.batchId.toString()) || 0
      })),
      students: studentList
    };
  }

  /**
   * Action 1: Dispatches workshop reminders to all active, entitled students in the session's batch.
   */
  static async sendWorkshopReminder(params: {
    sessionId: string;
    callerId: string;
    idempotencyKey?: string;
  }): Promise<IOperationalMessageResult> {
    const isSessionObjectId = /^[0-9a-fA-F]{24}$/.test(params.sessionId);
    if (!isSessionObjectId) throw new NotFoundError('LiveSession', params.sessionId);

    const isCallerObjectId = /^[0-9a-fA-F]{24}$/.test(params.callerId);
    if (!isCallerObjectId) throw new NotFoundError('User', params.callerId);

    await connectToDatabase();

    const caller = await UserModel.findById(params.callerId);
    if (!caller) throw new NotFoundError('User', params.callerId);

    // Canonical RBAC permission check
    if (!hasPermission(caller.globalRoles, 'messages:operate')) {
      throw new AuthorizationError('You do not have permission to send staff messages.');
    }

    const session = await LiveSessionModel.findById(params.sessionId);
    if (!session) throw new NotFoundError('LiveSession', params.sessionId);

    const batch = await BatchModel.findById(session.batchId);
    if (!batch) throw new NotFoundError('Batch', session.batchId.toString());

    const isGlobalAdmin = caller.globalRoles.some((r: UserRole) =>
      ['admin', 'superadmin', 'staff'].includes(r)
    );
    const isAssignedInstructor = batch.primaryInstructorId.toString() === caller._id.toString();

    if (!isGlobalAdmin && !isAssignedInstructor) {
      throw new AuthorizationError('You are not authorized to send reminders for this workshop session.');
    }

    if (session.status === 'cancelled') {
      throw new ValidationError('Cannot send reminders for a cancelled session.');
    }

    // Race-safe Idempotency Guard
    const idempotencyKey = params.idempotencyKey?.trim() || null;
    let messageRecord: IStaffMessageDocument | null = null;

    if (idempotencyKey) {
      const existing = await StaffMessageModel.findOne({ idempotencyKey });
      if (existing) {
        return {
          sent: existing.status === 'submitted' || existing.status === 'partially_failed',
          recipientCount: existing.recipientCount,
          failedCount: existing.failedCount,
          status: existing.status,
          messageId: existing._id.toString(),
          duplicate: true,
          error: existing.failureReason || undefined
        };
      }

      try {
        messageRecord = await StaffMessageModel.create({
          senderId: caller._id,
          senderName: caller.fullName,
          action: 'workshop_reminder',
          targetType: 'session',
          targetId: session._id,
          targetName: session.title,
          subject: `Upcoming Live Class: ${session.title}`,
          messagePreview: `Reminder for ${session.title}`,
          recipientCount: 0,
          failedCount: 0,
          status: 'failed',
          failureReason: 'Dispatch in progress',
          idempotencyKey,
          marketCode: batch.marketCode
        });
      } catch (err: any) {
        if (err.code === 11000 || err.name === 'MongoServerError') {
          const existingConflict = await StaffMessageModel.findOne({ idempotencyKey });
          if (existingConflict) {
            return {
              sent: existingConflict.status === 'submitted' || existingConflict.status === 'partially_failed',
              recipientCount: existingConflict.recipientCount,
              failedCount: existingConflict.failedCount,
              status: existingConflict.status,
              messageId: existingConflict._id.toString(),
              duplicate: true,
              error: existingConflict.failureReason || undefined
            };
          }
        }
        throw err;
      }
    } else {
      messageRecord = new StaffMessageModel({
        senderId: caller._id,
        senderName: caller.fullName,
        action: 'workshop_reminder',
        targetType: 'session',
        targetId: session._id,
        targetName: session.title,
        subject: `Upcoming Live Class: ${session.title}`,
        messagePreview: `Reminder for ${session.title}`,
        recipientCount: 0,
        failedCount: 0,
        status: 'failed',
        marketCode: batch.marketCode
      });
    }

    // Server-side recipient resolution: active enrollments + active entitlements
    const recipients = await this.resolveActiveBatchRecipients(batch._id);

    if (recipients.length === 0) {
      messageRecord.recipientCount = 0;
      messageRecord.failedCount = 0;
      messageRecord.status = 'submitted';
      messageRecord.failureReason = null;
      await messageRecord.save();

      return {
        sent: true,
        recipientCount: 0,
        failedCount: 0,
        status: 'submitted',
        messageId: messageRecord._id.toString()
      };
    }

    let dispatchedCount = 0;
    let failedCount = 0;

    for (const { email } of recipients) {
      const ok = await NotificationService.sendLiveSessionNotice(
        email,
        session.title,
        session.startTime,
        session.studentJoinUrl,
        batch.marketCode
      );
      if (ok) {
        dispatchedCount++;
      } else {
        failedCount++;
      }
    }

    const finalStatus: StaffMessageStatus =
      dispatchedCount === 0
        ? 'failed'
        : failedCount > 0
        ? 'partially_failed'
        : 'submitted';

    messageRecord.recipientCount = dispatchedCount;
    messageRecord.failedCount = failedCount;
    messageRecord.status = finalStatus;
    messageRecord.failureReason =
      finalStatus === 'failed'
        ? 'All notification dispatches failed at email provider.'
        : finalStatus === 'partially_failed'
        ? `${failedCount} of ${recipients.length} dispatches failed at provider.`
        : null;

    await messageRecord.save();

    return {
      sent: finalStatus === 'submitted' || finalStatus === 'partially_failed',
      recipientCount: dispatchedCount,
      failedCount,
      status: finalStatus,
      messageId: messageRecord._id.toString(),
      error: messageRecord.failureReason || undefined
    };
  }

  /**
   * Action 2: Dispatches operational batch email announcement to active, entitled cohort students.
   */
  static async sendBatchAnnouncement(params: {
    batchId: string;
    subject: string;
    message: string;
    callerId: string;
    idempotencyKey?: string;
  }): Promise<IOperationalMessageResult> {
    const isBatchObjectId = /^[0-9a-fA-F]{24}$/.test(params.batchId);
    if (!isBatchObjectId) throw new NotFoundError('Batch', params.batchId);

    const isCallerObjectId = /^[0-9a-fA-F]{24}$/.test(params.callerId);
    if (!isCallerObjectId) throw new NotFoundError('User', params.callerId);

    const subject = (params.subject || '').trim();
    if (!subject || subject.length > 200) {
      throw new ValidationError('Subject is required and must not exceed 200 characters.');
    }

    const message = (params.message || '').trim();
    if (!message || message.length > 5000) {
      throw new ValidationError('Message is required and must not exceed 5000 characters.');
    }

    await connectToDatabase();

    const caller = await UserModel.findById(params.callerId);
    if (!caller) throw new NotFoundError('User', params.callerId);

    // Canonical RBAC permission check
    if (!hasPermission(caller.globalRoles, 'messages:operate')) {
      throw new AuthorizationError('You do not have permission to send staff messages.');
    }

    const batch = await BatchModel.findById(params.batchId);
    if (!batch) throw new NotFoundError('Batch', params.batchId);

    const isGlobalAdmin = caller.globalRoles.some((r: UserRole) =>
      ['admin', 'superadmin', 'staff'].includes(r)
    );
    const isAssignedInstructor = batch.primaryInstructorId.toString() === caller._id.toString();

    if (!isGlobalAdmin && !isAssignedInstructor) {
      throw new AuthorizationError('You are not authorized to send announcements to this batch.');
    }

    // Race-safe Idempotency Guard
    const idempotencyKey = params.idempotencyKey?.trim() || null;
    let messageRecord: IStaffMessageDocument | null = null;

    if (idempotencyKey) {
      const existing = await StaffMessageModel.findOne({ idempotencyKey });
      if (existing) {
        return {
          sent: existing.status === 'submitted' || existing.status === 'partially_failed',
          recipientCount: existing.recipientCount,
          failedCount: existing.failedCount,
          status: existing.status,
          messageId: existing._id.toString(),
          duplicate: true,
          error: existing.failureReason || undefined
        };
      }

      try {
        messageRecord = await StaffMessageModel.create({
          senderId: caller._id,
          senderName: caller.fullName,
          action: 'batch_announcement',
          targetType: 'batch',
          targetId: batch._id,
          targetName: batch.name,
          subject,
          messagePreview: message.substring(0, 300),
          recipientCount: 0,
          failedCount: 0,
          status: 'failed',
          failureReason: 'Dispatch in progress',
          idempotencyKey,
          marketCode: batch.marketCode
        });
      } catch (err: any) {
        if (err.code === 11000 || err.name === 'MongoServerError') {
          const existingConflict = await StaffMessageModel.findOne({ idempotencyKey });
          if (existingConflict) {
            return {
              sent: existingConflict.status === 'submitted' || existingConflict.status === 'partially_failed',
              recipientCount: existingConflict.recipientCount,
              failedCount: existingConflict.failedCount,
              status: existingConflict.status,
              messageId: existingConflict._id.toString(),
              duplicate: true,
              error: existingConflict.failureReason || undefined
            };
          }
        }
        throw err;
      }
    } else {
      messageRecord = new StaffMessageModel({
        senderId: caller._id,
        senderName: caller.fullName,
        action: 'batch_announcement',
        targetType: 'batch',
        targetId: batch._id,
        targetName: batch.name,
        subject,
        messagePreview: message.substring(0, 300),
        recipientCount: 0,
        failedCount: 0,
        status: 'failed',
        marketCode: batch.marketCode
      });
    }

    // Server-side recipient resolution: active enrollments + active entitlements
    const recipients = await this.resolveActiveBatchRecipients(batch._id);

    if (recipients.length === 0) {
      messageRecord.recipientCount = 0;
      messageRecord.failedCount = 0;
      messageRecord.status = 'submitted';
      messageRecord.failureReason = null;
      await messageRecord.save();

      return {
        sent: true,
        recipientCount: 0,
        failedCount: 0,
        status: 'submitted',
        messageId: messageRecord._id.toString()
      };
    }

    let dispatchedCount = 0;
    let failedCount = 0;

    for (const { user, email } of recipients) {
      const ok = await NotificationService.sendBatchAnnouncement(
        email,
        user.fullName,
        batch.name,
        subject,
        message
      );
      if (ok) {
        dispatchedCount++;
      } else {
        failedCount++;
      }
    }

    const finalStatus: StaffMessageStatus =
      dispatchedCount === 0
        ? 'failed'
        : failedCount > 0
        ? 'partially_failed'
        : 'submitted';

    messageRecord.recipientCount = dispatchedCount;
    messageRecord.failedCount = failedCount;
    messageRecord.status = finalStatus;
    messageRecord.failureReason =
      finalStatus === 'failed'
        ? 'All notification dispatches failed at email provider.'
        : finalStatus === 'partially_failed'
        ? `${failedCount} of ${recipients.length} dispatches failed at provider.`
        : null;

    await messageRecord.save();

    return {
      sent: finalStatus === 'submitted' || finalStatus === 'partially_failed',
      recipientCount: dispatchedCount,
      failedCount,
      status: finalStatus,
      messageId: messageRecord._id.toString(),
      error: messageRecord.failureReason || undefined
    };
  }

  /**
   * Action 3: Dispatches individual operational email to an authorized student.
   */
  static async sendIndividualStudentEmail(params: {
    targetUserId: string;
    subject: string;
    message: string;
    callerId: string;
    idempotencyKey?: string;
  }): Promise<IOperationalMessageResult> {
    const isTargetObjectId = /^[0-9a-fA-F]{24}$/.test(params.targetUserId);
    if (!isTargetObjectId) throw new NotFoundError('User', params.targetUserId);

    const isCallerObjectId = /^[0-9a-fA-F]{24}$/.test(params.callerId);
    if (!isCallerObjectId) throw new NotFoundError('User', params.callerId);

    const subject = (params.subject || '').trim();
    if (!subject || subject.length > 200) {
      throw new ValidationError('Subject is required and must not exceed 200 characters.');
    }

    const message = (params.message || '').trim();
    if (!message || message.length > 5000) {
      throw new ValidationError('Message is required and must not exceed 5000 characters.');
    }

    await connectToDatabase();

    const caller = await UserModel.findById(params.callerId);
    if (!caller) throw new NotFoundError('User', params.callerId);

    // Canonical RBAC permission check
    if (!hasPermission(caller.globalRoles, 'messages:operate')) {
      throw new AuthorizationError('You do not have permission to send staff messages.');
    }

    const targetUser = await UserModel.findById(params.targetUserId);
    if (!targetUser) throw new NotFoundError('User', params.targetUserId);

    if (!targetUser.globalRoles.includes('student')) {
      throw new ValidationError('Target user must be a student.');
    }

    if (targetUser.status !== 'active') {
      throw new ValidationError('Target student account is not active.');
    }

    const isGlobalAdmin = caller.globalRoles.some((r: UserRole) =>
      ['admin', 'superadmin', 'staff'].includes(r)
    );

    let isAuthorized = isGlobalAdmin;

    if (!isGlobalAdmin && caller.globalRoles.includes('instructor')) {
      // Find batches where caller is assigned primary instructor
      const instructorBatches = await BatchModel.find({ primaryInstructorId: caller._id });
      const batchIds = instructorBatches.map(b => b._id);

      // Verify student holds an active enrollment backed by an active entitlement in one of instructor's batches
      const enrollments = await EnrollmentModel.find({
        userId: targetUser._id,
        batchId: { $in: batchIds },
        status: 'active'
      });

      if (enrollments.length > 0) {
        const entitlementIds = enrollments.map(e => e.entitlementId).filter(Boolean);
        const validEntitlements = await EntitlementModel.find({
          _id: { $in: entitlementIds },
          status: 'active'
        });
        const now = new Date();
        if (validEntitlements.some(ent => ent.isAccessValid(now))) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      throw new AuthorizationError('You are not authorized to contact this student.');
    }

    // Race-safe Idempotency Guard
    const idempotencyKey = params.idempotencyKey?.trim() || null;
    let messageRecord: IStaffMessageDocument | null = null;

    if (idempotencyKey) {
      const existing = await StaffMessageModel.findOne({ idempotencyKey });
      if (existing) {
        return {
          sent: existing.status === 'submitted' || existing.status === 'partially_failed',
          recipientCount: existing.recipientCount,
          failedCount: existing.failedCount,
          status: existing.status,
          messageId: existing._id.toString(),
          duplicate: true,
          error: existing.failureReason || undefined
        };
      }

      try {
        messageRecord = await StaffMessageModel.create({
          senderId: caller._id,
          senderName: caller.fullName,
          action: 'individual_email',
          targetType: 'user',
          targetId: targetUser._id,
          targetName: targetUser.fullName,
          subject,
          messagePreview: message.substring(0, 300),
          recipientCount: 0,
          failedCount: 0,
          status: 'failed',
          failureReason: 'Dispatch in progress',
          idempotencyKey,
          marketCode: targetUser.lastActiveMarket || 'SG'
        });
      } catch (err: any) {
        if (err.code === 11000 || err.name === 'MongoServerError') {
          const existingConflict = await StaffMessageModel.findOne({ idempotencyKey });
          if (existingConflict) {
            return {
              sent: existingConflict.status === 'submitted' || existingConflict.status === 'partially_failed',
              recipientCount: existingConflict.recipientCount,
              failedCount: existingConflict.failedCount,
              status: existingConflict.status,
              messageId: existingConflict._id.toString(),
              duplicate: true,
              error: existingConflict.failureReason || undefined
            };
          }
        }
        throw err;
      }
    } else {
      messageRecord = new StaffMessageModel({
        senderId: caller._id,
        senderName: caller.fullName,
        action: 'individual_email',
        targetType: 'user',
        targetId: targetUser._id,
        targetName: targetUser.fullName,
        subject,
        messagePreview: message.substring(0, 300),
        recipientCount: 0,
        failedCount: 0,
        status: 'failed',
        marketCode: targetUser.lastActiveMarket || 'SG'
      });
    }

    const ok = await NotificationService.sendIndividualStudentEmail(
      targetUser.email,
      targetUser.fullName,
      caller.fullName,
      subject,
      message
    );

    const finalStatus: StaffMessageStatus = ok ? 'submitted' : 'failed';
    messageRecord.recipientCount = ok ? 1 : 0;
    messageRecord.failedCount = ok ? 0 : 1;
    messageRecord.status = finalStatus;
    messageRecord.failureReason = ok ? null : 'Failed to dispatch email via notification provider.';
    await messageRecord.save();

    return {
      sent: ok,
      recipientCount: ok ? 1 : 0,
      failedCount: ok ? 0 : 1,
      status: finalStatus,
      messageId: messageRecord._id.toString(),
      error: messageRecord.failureReason || undefined
    };
  }

  /**
   * Retrieves operational message history scoped strictly by staff permissions:
   * - Admin/superadmin/staff: view recent messages system-wide
   * - Instructor: view messages they sent OR messages concerning their explicitly assigned batches
   * Privacy: Message preview is truncated and raw recipient PII lists are omitted.
   */
  static async getMessageHistory(callerId: string, limit: number = 50): Promise<IStaffMessageSafeDTO[]> {
    const isCallerObjectId = /^[0-9a-fA-F]{24}$/.test(callerId);
    if (!isCallerObjectId) throw new NotFoundError('User', callerId);

    await connectToDatabase();

    const caller = await UserModel.findById(callerId);
    if (!caller) throw new NotFoundError('User', callerId);

    // Canonical RBAC permission check
    if (!hasPermission(caller.globalRoles, 'messages:operate')) {
      throw new AuthorizationError('Requires staff messaging privileges.');
    }

    const isGlobalAdmin = caller.globalRoles.some((r: UserRole) =>
      ['admin', 'superadmin', 'staff'].includes(r)
    );

    let query: any = {};
    if (!isGlobalAdmin) {
      // Instructors see only messages they sent OR messages targeting batches they are assigned to
      const assignedBatches = await BatchModel.find({ primaryInstructorId: caller._id });
      const batchIds = assignedBatches.map(b => b._id);
      query = {
        $or: [
          { senderId: caller._id },
          { targetType: 'batch', targetId: { $in: batchIds } }
        ]
      };
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const messages = await StaffMessageModel.find(query)
      .sort({ createdAt: -1 })
      .limit(safeLimit);

    return messages.map(m => m.toSafeDTO());
  }
}
