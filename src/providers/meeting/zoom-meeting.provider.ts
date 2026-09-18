import {
  ILiveMeetingProvider,
  CreateMeetingParams,
  CreateMeetingResult
} from './meeting-provider.interface';
import { logger } from '@/lib/logger';
import { ApplicationError } from '@/lib/errors';

export interface ZoomProviderConfig {
  accountId: string;
  clientId: string;
  clientSecret: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Production Zoom Live Meeting Provider
 * Implements Zoom Server-to-Server OAuth flow and Meeting API integration.
 * Invariants:
 * - Credentials sourced strictly from environment configuration
 * - OAuth access token cached safely in-memory until expiration
 * - Host URL and Join URL extracted; host URL strictly protected by service layer DTOs
 */
export class ZoomMeetingProvider implements ILiveMeetingProvider {
  public readonly providerName = 'zoom';

  private readonly config: ZoomProviderConfig;
  private cachedToken: CachedToken | null = null;

  constructor(config: ZoomProviderConfig) {
    if (!config.accountId || !config.clientId || !config.clientSecret) {
      throw new ApplicationError(
        'Invalid Zoom Provider configuration: Missing required accountId, clientId, or clientSecret.'
      );
    }
    this.config = config;
  }

  async createMeeting(params: CreateMeetingParams): Promise<CreateMeetingResult> {
    const accessToken = await this.getAccessToken();

    // S2S OAuth account-level API call to create meeting for instructor/account user
    const endpoint = 'https://api.zoom.us/v2/users/me/meetings';

    const payload = {
      topic: params.topic,
      type: 2, // Scheduled meeting
      start_time: params.startTime.toISOString(),
      duration: params.durationMinutes,
      timezone: params.timezone || 'Asia/Singapore',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        auto_recording: 'none'
      }
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error('[ZoomMeetingProvider] Zoom API meeting creation failed', {
          status: res.status,
          error: errorText.substring(0, 200)
        });
        throw new ApplicationError(`Zoom meeting creation failed with status HTTP ${res.status}.`);
      }

      const data = await res.json();
      const meetingId = String(data.id);
      const hostUrl = data.start_url;
      const studentJoinUrl = data.join_url;

      if (!meetingId || !hostUrl || !studentJoinUrl) {
        throw new ApplicationError('Zoom API returned incomplete meeting payload.');
      }

      logger.info('[ZoomMeetingProvider] Created Zoom live classroom session', {
        meetingId,
        topic: params.topic
      });

      return {
        meetingId,
        hostUrl,
        studentJoinUrl,
        providerMeta: {
          zoomMeetingId: data.id,
          uuid: data.uuid,
          timezone: data.timezone,
          createdAt: new Date().toISOString()
        }
      };
    } catch (err: any) {
      if (err instanceof ApplicationError) throw err;
      logger.error('[ZoomMeetingProvider] Network error during Zoom API request', {
        error: err.message
      });
      throw new ApplicationError('Failed to communicate with Zoom meeting provider.');
    }
  }

  async getRecordingUrl(meetingId: string): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken();
      const res = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/recordings`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.share_url || null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves or refreshes Zoom Server-to-Server OAuth token
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60000) {
      return this.cachedToken.accessToken;
    }

    const authHeader = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(
      this.config.accountId
    )}`;

    try {
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!res.ok) {
        logger.error('[ZoomMeetingProvider] Zoom OAuth token exchange failed', { status: res.status });
        throw new ApplicationError('Zoom OAuth authentication failed.');
      }

      const data = await res.json();
      const accessToken = data.access_token;
      const expiresInSeconds = data.expires_in || 3600;

      if (!accessToken) {
        throw new ApplicationError('Zoom OAuth payload missing access token.');
      }

      this.cachedToken = {
        accessToken,
        expiresAt: now + expiresInSeconds * 1000
      };

      return accessToken;
    } catch (err: any) {
      if (err instanceof ApplicationError) throw err;
      logger.error('[ZoomMeetingProvider] Network error during Zoom token exchange', {
        error: err.message
      });
      throw new ApplicationError('Zoom OAuth network request failed.');
    }
  }
}
