import { ILiveMeetingProvider } from './meeting-provider.interface';
import { MockMeetingProvider } from './mock-meeting.provider';
import { ZoomMeetingProvider } from './zoom-meeting.provider';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ApplicationError } from '@/lib/errors';

export class MeetingProviderFactory {
  private static mockProvider = new MockMeetingProvider();
  private static zoomProvider?: ZoomMeetingProvider;

  static getProvider(providerType?: string): ILiveMeetingProvider {
    const rawType = providerType || (config.providers.useMockMeeting ? 'mock' : config.providers.meeting.provider);
    const targetType = rawType?.toLowerCase().trim();

    if (targetType === 'mock' || (config.providers.useMockMeeting && !providerType)) {
      return this.mockProvider;
    }

    if (targetType === 'zoom') {
      if (!this.zoomProvider) {
        const { accountId, clientId, clientSecret } = config.providers.meeting;

        if (!accountId || !clientId || !clientSecret) {
          throw new ApplicationError(
            '[MeetingProviderFactory] Production Zoom provider requested but missing required environment variables (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, or ZOOM_CLIENT_SECRET).'
          );
        }

        logger.info('[MeetingProviderFactory] Initializing Zoom Live Meeting Provider', {
          accountId
        });

        this.zoomProvider = new ZoomMeetingProvider({
          accountId,
          clientId,
          clientSecret
        });
      }

      return this.zoomProvider;
    }

    // Explicit unsupported/unknown provider must throw ApplicationError (never silently return mock)
    throw new ApplicationError(
      `[MeetingProviderFactory] Unsupported or invalid live meeting provider: '${providerType || targetType}'.`
    );
  }
}
