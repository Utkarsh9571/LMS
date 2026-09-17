/**
 * Live Meeting Provider Contract
 * Standard interface for cohort/batch live classrooms (Zoom, Google Meet, Mock)
 */

export interface CreateMeetingParams {
  topic: string;
  startTime: Date;
  durationMinutes: number;
  timezone: string;
  instructorEmail: string;
}

export interface CreateMeetingResult {
  meetingId: string;
  hostUrl: string;
  studentJoinUrl: string;
  providerMeta?: Record<string, unknown>;
}

export interface ILiveMeetingProvider {
  readonly providerName: string;
  createMeeting(params: CreateMeetingParams): Promise<CreateMeetingResult>;
  getRecordingUrl?(meetingId: string): Promise<string | null>;
}
