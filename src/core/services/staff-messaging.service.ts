import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/core/domain/user.model';
import { BatchModel } from '@/core/domain/batch.model';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { CourseModel } from '@/core/domain/course.model';
import { NotificationService } from '@/core/services/notification.service';
import { UserRole } from '@/core/domain/domain-types';
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
    email: string;
    batchName: string;
  }>;
}

export class StaffMessagingService {
  /**
   * Retrieves message options (authorized batches, sessions, and students) for staff dropdowns
   */
  static async getMessageOptions(callerId: string): Promise<IMessageOptionsResponse> {
    const isCallerObjectId = /^[0-9a-fA-F]{24}$/.test(callerId);
    if (!isCallerObjectId) throw new NotFoundError('User', callerId);

    await connectToDatabase();

    const caller = await UserModel.findById(callerId);
    if (!caller) throw new NotFoundError('User', callerId);

    const isGlobalAdmin = caller.globalRoles.some((r: UserRole) =>
      ['admin', 'superadmin', 'staff'].includes(r)
    );
    const isInstructor = caller.globalRoles.includes('instructor');

    if (!isGlobalAdmin && !isInstructor) {
      throw new AuthorizationError('Requires staff or instructor privileges.');
    }

    const batchQuery = isGlobalAdmin ? {} : { primaryInstructorId: caller._id };
    const batches = await BatchModel.find(batchQuery).sort({ createdAt: -1 });
    const batchIds = batches.map(b => b._id);
    const courseIds = Array.from(new Set(batches.map(b => b.courseId.toString())));

    const [courses, sessions, enrollments] = await Promise.all([
      courseIds.length > 0 ? CourseModel.find({ _id: { $in: courseIds } }) : [],
      batchIds.length > 0 ? LiveSessionModel.find({ batchId: { $in: batchIds } }).sort({ startTime: -1 }) : [],
      batchIds.length > 0 ? EnrollmentModel.find({ batchId: { $in: batchIds }, status: 'active' }) : []
    ]);

    const courseMap = new Map(courses.map(c => [c._id.toString(), c.title]));
    const batchMap = new Map(batches.map(b => [b._id.toString(), b.name]));

    // Calculate enrollment count per batch
    const batchEnrollmentCountMap = new Map<string, number>();
    enrollments.forEach(e => {
      const bId = e.batchId?.toString();
      if (bId) {
        batchEnrollmentCountMap.set(bId, (batchEnrollmentCountMap.get(bId) || 0) + 1);
      }
    });

    const studentUserIds = Array.from(new Set(enrollments.map(e => e.userId.toString())));
    const studentUsers = studentUserIds.length > 0 ? await UserModel.find({ _id: { $in: studentUserIds } }) : [];
    const studentUserMap = new Map(studentUsers.map(u => [u._id.toString(), u]));

    // Build student list linked to batch name
    const studentList: IMessageOptionsResponse['students'] = [];
    const studentSeenSet = new Set<string>();

    enrollments.forEach(e => {
      const uIdStr = e.userId.toString();
      const bIdStr = e.batchId?.toString() || '';
      const key = `${uIdStr}:${bIdStr}`;
      if (!studentSeenSet.has(key)) {
        studentSeenSet.add(key);
        const u = studentUserMap.get(uIdStr);
        if (u) {
          studentList.push({
            id: u._id.toString(),
            fullName: u.fullName,
            email: u.email,
            batchName: batchMap.get(bIdStr) || 'Cohort Batch'
          });
        }
      }
    });

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
   * Action 1: Dispatches workshop reminders to all active enrolled students in the session's batch.
   */
  static async sendWorkshopReminder(params: {
    sessionId: string;
    callerId: string;
  }): Promise<{ sent: true; recipientCount: number }> {
    const isSessionObjectId = /^[0-9a-fA-F]{24}$/.test(params.sessionId);
    if (!isSessionObjectId) throw new NotFoundError('LiveSession', params.sessionId);

    const isCallerObjectId = /^[0-9a-fA-F]{24}$/.test(params.callerId);
    if (!isCallerObjectId) throw new NotFoundError('User', params.callerId);

    await connectToDatabase();

    const session = await LiveSessionModel.findById(params.sessionId);
    if (!session) throw new NotFoundError('LiveSession', params.sessionId);

    const batch = await BatchModel.findById(session.batchId);
    if (!batch) throw new NotFoundError('Batch', session.batchId.toString());

    const caller = await UserModel.findById(params.callerId);
    if (!caller) throw new NotFoundError('User', params.callerId);

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

    // Server-side recipient calculation
    const enrollments = await EnrollmentModel.find({ batchId: batch._id, status: 'active' });
    const userIds = Array.from(new Set(enrollments.map(e => e.userId.toString())));

    if (userIds.length === 0) {
      return { sent: true, recipientCount: 0 };
    }

    const students = await UserModel.find({ _id: { $in: userIds } });
    const recipientEmails = Array.from(
      new Set(students.map(s => s.email).filter(e => typeof e === 'string' && e.trim().length > 0))
    );

    let dispatchedCount = 0;
    for (const email of recipientEmails) {
      const ok = await NotificationService.sendLiveSessionNotice(
        email,
        session.title,
        session.startTime,
        session.studentJoinUrl
      );
      if (ok) dispatchedCount++;
    }

    return { sent: true, recipientCount: dispatchedCount };
  }

  /**
   * Action 2: Dispatches operational batch email announcement to active cohort students.
   */
  static async sendBatchAnnouncement(params: {
    batchId: string;
    subject: string;
    message: string;
    callerId: string;
  }): Promise<{ sent: true; recipientCount: number }> {
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

    const batch = await BatchModel.findById(params.batchId);
    if (!batch) throw new NotFoundError('Batch', params.batchId);

    const caller = await UserModel.findById(params.callerId);
    if (!caller) throw new NotFoundError('User', params.callerId);

    const isGlobalAdmin = caller.globalRoles.some((r: UserRole) =>
      ['admin', 'superadmin', 'staff'].includes(r)
    );
    const isAssignedInstructor = batch.primaryInstructorId.toString() === caller._id.toString();

    if (!isGlobalAdmin && !isAssignedInstructor) {
      throw new AuthorizationError('You are not authorized to send announcements to this batch.');
    }

    // Server-side recipient calculation from active enrollments
    const enrollments = await EnrollmentModel.find({ batchId: batch._id, status: 'active' });
    const userIds = Array.from(new Set(enrollments.map(e => e.userId.toString())));

    if (userIds.length === 0) {
      return { sent: true, recipientCount: 0 };
    }

    const students = await UserModel.find({ _id: { $in: userIds } });
    const studentMap = new Map<string, typeof students[0]>();
    students.forEach(s => {
      if (s.email && s.email.trim() && !studentMap.has(s.email.trim().toLowerCase())) {
        studentMap.set(s.email.trim().toLowerCase(), s);
      }
    });

    let dispatchedCount = 0;
    for (const student of Array.from(studentMap.values())) {
      const ok = await NotificationService.sendBatchAnnouncement(
        student.email,
        student.fullName,
        batch.name,
        subject,
        message
      );
      if (ok) dispatchedCount++;
    }

    return { sent: true, recipientCount: dispatchedCount };
  }

  /**
   * Action 3: Dispatches individual operational email to an authorized student.
   */
  static async sendIndividualStudentEmail(params: {
    targetUserId: string;
    subject: string;
    message: string;
    callerId: string;
  }): Promise<{ sent: true; recipientCount: number }> {
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

    const targetUser = await UserModel.findById(params.targetUserId);
    if (!targetUser) throw new NotFoundError('User', params.targetUserId);

    if (!targetUser.globalRoles.includes('student')) {
      throw new ValidationError('Target user must be a student.');
    }

    const caller = await UserModel.findById(params.callerId);
    if (!caller) throw new NotFoundError('User', params.callerId);

    const isGlobalAdmin = caller.globalRoles.some((r: UserRole) =>
      ['admin', 'superadmin', 'staff'].includes(r)
    );

    let isAuthorized = isGlobalAdmin;

    if (!isGlobalAdmin && caller.globalRoles.includes('instructor')) {
      const instructorBatches = await BatchModel.find({ primaryInstructorId: caller._id });
      const batchIds = instructorBatches.map(b => b._id);
      const enrollment = await EnrollmentModel.findOne({
        userId: targetUser._id,
        batchId: { $in: batchIds },
        status: 'active'
      });
      if (enrollment) isAuthorized = true;
    }

    if (!isAuthorized) {
      throw new AuthorizationError('You are not authorized to contact this student.');
    }

    const ok = await NotificationService.sendIndividualStudentEmail(
      targetUser.email,
      targetUser.fullName,
      caller.fullName,
      subject,
      message
    );

    return { sent: true, recipientCount: ok ? 1 : 0 };
  }
}
