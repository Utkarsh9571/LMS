import { connectToDatabase } from '@/lib/db';
import { AttendanceModel } from '@/core/domain/attendance.model';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { UserModel } from '@/core/domain/user.model';
import { BatchModel } from '@/core/domain/batch.model';
import { AttendanceStatus, IAttendanceSafeDTO } from '@/core/domain/domain-types';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export class AttendanceService {
  /**
   * Idempotently records a student joining a LiveSession.
   * Invariant: Requires authenticated user + active Enrollment matching userId + courseId + batchId.
   * Never exposes hostUrl to student.
   * Returns studentJoinUrl.
   */
  static async joinSession(
    sessionId: string,
    userId: string,
    ipAddress?: string
  ): Promise<{ studentJoinUrl: string; attendance: IAttendanceSafeDTO }> {
    await connectToDatabase();

    const session = await LiveSessionModel.findById(sessionId);
    if (!session) throw new NotFoundError('LiveSession', sessionId);

    if (session.status === 'cancelled') {
      throw new ValidationError('This live session has been cancelled.');
    }

    // Authorization invariant:
    // Student must have an active enrollment matching { userId, courseId, batchId, status: 'active' }
    const enrollment = await EnrollmentModel.findOne({
      userId,
      courseId: session.courseId,
      batchId: session.batchId,
      status: 'active'
    });

    if (!enrollment) {
      throw new AuthorizationError(
        'You do not have an active cohort enrollment for this batch live class.'
      );
    }

    const now = new Date();

    // Idempotent upsert:
    // First join sets joinedAt, status='present', and joinCount=1.
    // Subsequent joins update lastSeenAt and increment joinCount.
    const attendanceDoc = await AttendanceModel.findOneAndUpdate(
      {
        liveSessionId: session._id,
        userId
      },
      {
        $setOnInsert: {
          batchId: session.batchId,
          status: 'present',
          joinedAt: now
        },
        $set: {
          lastSeenAt: now,
          ...(ipAddress ? { ipAddress } : {})
        },
        $inc: { joinCount: 1 }
      },
      { upsert: true, new: true }
    );

    logger.info('Student joined LiveSession', {
      sessionId: session._id.toString(),
      userId,
      joinCount: attendanceDoc.joinCount
    });

    return {
      studentJoinUrl: session.studentJoinUrl,
      attendance: attendanceDoc.toSafeDTO()
    };
  }

  /**
   * Lists attendance records for a session (Admin / Assigned Instructor)
   */
  static async listSessionAttendance(
    sessionId: string,
    callerId: string
  ): Promise<IAttendanceSafeDTO[]> {
    await connectToDatabase();

    const session = await LiveSessionModel.findById(sessionId);
    if (!session) throw new NotFoundError('LiveSession', sessionId);

    const batch = await BatchModel.findById(session.batchId);
    if (!batch) throw new NotFoundError('Batch', session.batchId.toString());

    const caller = await UserModel.findById(callerId);
    if (!caller) throw new NotFoundError('User', callerId);

    const isGlobalAdmin = caller.globalRoles.some(r => ['admin', 'superadmin', 'staff'].includes(r));
    const isAssignedInstructor = batch.primaryInstructorId.toString() === caller._id.toString();

    if (!isGlobalAdmin && !isAssignedInstructor) {
      throw new AuthorizationError('You are not authorized to view attendance for this session.');
    }

    const records = await AttendanceModel.find({ liveSessionId: session._id }).sort({ joinedAt: 1 });
    return records.map(r => r.toSafeDTO());
  }

  /**
   * Updates an attendance record status (present, late, absent, excused)
   */
  static async updateAttendanceStatus(
    sessionId: string,
    targetUserId: string,
    status: AttendanceStatus,
    callerId: string
  ): Promise<IAttendanceSafeDTO> {
    const isSessionObjectId = /^[0-9a-fA-F]{24}$/.test(sessionId);
    if (!isSessionObjectId) throw new NotFoundError('LiveSession', sessionId);

    const isUserObjectId = /^[0-9a-fA-F]{24}$/.test(targetUserId);
    if (!isUserObjectId) throw new NotFoundError('User', targetUserId);

    await connectToDatabase();

    const session = await LiveSessionModel.findById(sessionId);
    if (!session) throw new NotFoundError('LiveSession', sessionId);

    const batch = await BatchModel.findById(session.batchId);
    if (!batch) throw new NotFoundError('Batch', session.batchId.toString());

    const caller = await UserModel.findById(callerId);
    if (!caller) throw new NotFoundError('User', callerId);

    const isGlobalAdmin = caller.globalRoles.some(r => ['admin', 'superadmin'].includes(r));
    const isAssignedInstructor = batch.primaryInstructorId.toString() === caller._id.toString();

    if (!isGlobalAdmin && !isAssignedInstructor) {
      throw new AuthorizationError('You are not authorized to update attendance.');
    }

    const record = await AttendanceModel.findOne({
      liveSessionId: session._id,
      userId: targetUserId
    });

    if (!record) {
      throw new NotFoundError('Attendance record for user in session', `${targetUserId}:${sessionId}`);
    }

    record.status = status;
    await record.save();
    return record.toSafeDTO();
  }

  /**
   * Retrieves full session attendance workspace roster and summary statistics.
   * Enforces server-side RBAC (Global Admin/Staff OR assigned Primary Instructor).
   */
  static async getSessionAttendanceWorkspace(
    sessionId: string,
    callerId: string
  ) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(sessionId);
    if (!isObjectId) throw new NotFoundError('LiveSession', sessionId);

    await connectToDatabase();

    const session = await LiveSessionModel.findById(sessionId);
    if (!session) throw new NotFoundError('LiveSession', sessionId);

    const batch = await BatchModel.findById(session.batchId);
    if (!batch) throw new NotFoundError('Batch', session.batchId.toString());

    const isCallerObjectId = /^[0-9a-fA-F]{24}$/.test(callerId);
    if (!isCallerObjectId) throw new NotFoundError('User', callerId);

    const caller = await UserModel.findById(callerId);
    if (!caller) throw new NotFoundError('User', callerId);

    const isGlobalAdmin = caller.globalRoles.some(r => ['admin', 'superadmin', 'staff'].includes(r));
    const isAssignedInstructor = batch.primaryInstructorId.toString() === caller._id.toString();

    if (!isGlobalAdmin && !isAssignedInstructor) {
      throw new AuthorizationError('You are not authorized to view attendance for this session.');
    }

    // 1. Fetch enrolled students in batch
    const enrollments = await EnrollmentModel.find({ batchId: batch._id, status: 'active' });
    const userIds = enrollments.map(e => e.userId);

    // 2. Fetch student profiles and existing attendance records
    const [users, attendanceRecords] = await Promise.all([
      userIds.length > 0 ? UserModel.find({ _id: { $in: userIds } }) : [],
      AttendanceModel.find({ liveSessionId: session._id })
    ]);

    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    const attendanceMap = new Map(attendanceRecords.map(a => [a.userId.toString(), a]));

    let totalAttended = 0;

    const roster = enrollments.map(e => {
      const uIdStr = e.userId.toString();
      const user = userMap.get(uIdStr);
      const att = attendanceMap.get(uIdStr);

      const status: AttendanceStatus | 'unjoined' = att ? att.status : 'absent';
      if (att && ['present', 'late'].includes(att.status)) {
        totalAttended++;
      }

      return {
        userId: uIdStr,
        fullName: user ? user.fullName : 'Unknown Student',
        email: user ? user.email : '',
        status,
        joinedAt: att ? att.joinedAt.toISOString() : null,
        lastSeenAt: att && att.lastSeenAt ? att.lastSeenAt.toISOString() : null,
        joinCount: att ? att.joinCount : 0
      };
    });

    const totalEnrolled = enrollments.length;
    const attendancePercentage = totalEnrolled > 0 ? Math.round((totalAttended / totalEnrolled) * 100) : 0;

    return {
      session: {
        id: session._id.toString(),
        title: session.title,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime.toISOString(),
        status: session.status,
        batchId: session.batchId.toString(),
        courseId: session.courseId.toString()
      },
      batch: {
        id: batch._id.toString(),
        name: batch.name,
        primaryInstructorId: batch.primaryInstructorId.toString()
      },
      summary: {
        totalEnrolled,
        totalAttended,
        attendancePercentage
      },
      roster
    };
  }
}
