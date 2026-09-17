import {
  ILiveMeetingProvider,
  CreateMeetingParams,
  CreateMeetingResult
} from './meeting-provider.interface';
import { logger } from '@/lib/logger';

/**
 * Mock Live Meeting Provider Implementation
 * 
 * Invariants:
 * - Generates deterministic local testing URLs without external API dependencies
 * - No credentials required
 */
export class MockMeetingProvider implements ILiveMeetingProvider {
  public readonly providerName = 'mock';

  async createMeeting(params: CreateMeetingParams): Promise<CreateMeetingResult> {
    const meetingId = `mock_mtg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hostUrl = `/mock-meeting/host?id=${meetingId}&topic=${encodeURIComponent(params.topic)}`;
    const studentJoinUrl = `/mock-meeting/join?id=${meetingId}&topic=${encodeURIComponent(params.topic)}`;

    logger.info('[MockMeetingProvider] Created mock live class session', {
      topic: params.topic,
      meetingId,
      instructorEmail: params.instructorEmail
    });

    return {
      meetingId,
      hostUrl,
      studentJoinUrl,
      providerMeta: {
        scheduledStartTime: params.startTime.toISOString(),
        durationMinutes: params.durationMinutes,
        timezone: params.timezone
      }
    };
  }

  async getRecordingUrl(meetingId: string): Promise<string | null> {
    return `/mock-recordings/${meetingId}.mp4`;
  }
}
