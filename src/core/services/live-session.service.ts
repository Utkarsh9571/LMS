import { connectToDatabase } from '@/lib/db';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { BatchModel } from '@/core/domain/batch.model';
import { UserModel } from '@/core/domain/user.model';
import { MeetingProviderFactory } from '@/providers/meeting/meeting-provider.factory';
import {
  ILiveSessionSafeDTO,
  LiveSessionStatus,
  RecordingStatus
} from '@/core/domain/domain-types';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface CreateLiveSessionInput {
  batchId: string;
  title: string;
  description?: string;
  startTime: string | Date;
  durationMinutes: number;
}

export interface UpdateLiveSessionInput {
  title?: string;
  description?: string;
  status?: LiveSessionStatus;
  startTime?: string | Date;
  durationMinutes?: number;
  recordingStatus?: RecordingStatus;
  recordingUrl?: string | null;
  recordingDurationSeconds?: number | null;
}

export class LiveSessionService {
  /**
   * Schedules a new LiveSession attached to a Batch using MockMeetingProvider
   */
  static async createSession(
    input: CreateLiveSessionInput,
    callerId: string
  ): Promise<ILiveSessionSafeDTO> {
    await connectToDatabase();

    const batch = await BatchModel.findById(input.batchId);
    if (!batch) throw new NotFoundError('Batch', input.batchId);

    // Verify caller authorization: superadmin, admin, or assigned primary instructor
    const caller = await UserModel.findById(callerId);
    if (!caller) throw new NotFoundError('User', callerId);

    const isGlobalAdmin = caller.globalRoles.some(r => ['admin', 'superadmin'].includes(r));
    const isAssignedInstructor = batch.primaryInstructorId.toString() === caller._id.toString();

    if (!isGlobalAdmin && !isAssignedInstructor) {
      throw new AuthorizationError('You are not authorized to schedule live sessions for this batch.');
    }

    const start = new Date(input.startTime);
    if (isNaN(start.getTime())) {
      throw new ValidationError('Valid startTime is required.');
    }
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 1) {
      throw new ValidationError('Duration must be an integer of at least 1 minute.');
    }

    const endTime = new Date(start.getTime() + input.durationMinutes * 60 * 1000);

    // Provider allocation via MeetingProviderFactory
    const meetingProvider = MeetingProviderFactory.getProvider(batch.meetingProvider as any);
    const meetingResult = await meetingProvider.createMeeting({
      topic: `${batch.name} - ${input.title.trim()}`,
      startTime: start,
      durationMinutes: input.durationMinutes,
      timezone: 'Asia/Singapore',
      instructorEmail: caller.email
    });

    const session = await LiveSessionModel.create({
      batchId: batch._id,
      courseId: batch.courseId,
      title: input.title.trim(),
      description: input.description?.trim(),
      status: 'scheduled',
      startTime: start,
      endTime,
      durationMinutes: input.durationMinutes,
      meetingProvider: meetingProvider.providerName as any,
      providerMeetingId: meetingResult.meetingId,
      hostUrl: meetingResult.hostUrl,
      studentJoinUrl: meetingResult.studentJoinUrl,
      recordingStatus: 'none'
    });

    logger.info('Scheduled LiveSession', {
      sessionId: session._id.toString(),
      batchId: batch._id.toString(),
      providerMeetingId: session.providerMeetingId
    });

    // Return safe DTO with hostUrl included for instructor/admin
    return session.toSafeDTO(true);
  }

  /**
   * Updates an existing LiveSession
   */
  static async updateSession(
    sessionId: string,
    input: UpdateLiveSessionInput,
    callerId: string
  ): Promise<ILiveSessionSafeDTO> {
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
      throw new AuthorizationError('You are not authorized to update this live session.');
    }

    if (input.title) session.title = input.title.trim();
    if (input.description !== undefined) session.description = input.description.trim();
    if (input.status) session.status = input.status;

    if (input.startTime || input.durationMinutes) {
      const start = input.startTime ? new Date(input.startTime) : session.startTime;
      const duration = input.durationMinutes ?? session.durationMinutes;
      if (isNaN(start.getTime())) throw new ValidationError('Invalid startTime.');
      if (duration < 1) throw new ValidationError('Duration must be at least 1 minute.');
      session.startTime = start;
      session.durationMinutes = duration;
      session.endTime = new Date(start.getTime() + duration * 60 * 1000);
    }

    if (input.recordingStatus) session.recordingStatus = input.recordingStatus;
    if (input.recordingUrl !== undefined) session.recordingUrl = input.recordingUrl;
    if (input.recordingDurationSeconds !== undefined) {
      session.recordingDurationSeconds = input.recordingDurationSeconds;
    }

    await session.save();
    return session.toSafeDTO(true);
  }

  /**
   * Lists sessions for a batch
   */
  static async listSessionsForBatch(
    batchId: string,
    includeHostUrl: boolean = false
  ): Promise<ILiveSessionSafeDTO[]> {
    await connectToDatabase();
    const sessions = await LiveSessionModel.find({ batchId }).sort({ startTime: 1 });
    return sessions.map(s => s.toSafeDTO(includeHostUrl));
  }

  /**
   * Gets single session
   */
  static async getSessionById(
    sessionId: string,
    includeHostUrl: boolean = false
  ): Promise<ILiveSessionSafeDTO> {
    await connectToDatabase();
    const session = await LiveSessionModel.findById(sessionId);
    if (!session) throw new NotFoundError('LiveSession', sessionId);
    return session.toSafeDTO(includeHostUrl);
  }
}
