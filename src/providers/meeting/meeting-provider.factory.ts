import { ILiveMeetingProvider } from './meeting-provider.interface';
import { MockMeetingProvider } from './mock-meeting.provider';
import { ZoomMeetingProvider } from './zoom-meeting.provider';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ApplicationError } from '@/lib/errors';

export class MeetingProviderFactory {
  private static mockProvider = new MockMeetingProvider();
  private static zoomProvider?: ZoomMeetingProvider;

  static getProvider(providerType?: 'mock' | 'zoom'): ILiveMeetingProvider {
    const targetType = providerType || (config.providers.useMockMeeting ? 'mock' : 'zoom');

    if (targetType === 'mock' || config.providers.useMockMeeting) {
      return this.mockProvider;
    }

    if (targetType === 'zoom') {
      if (!this.zoomProvider) {
        const { accountId, clientId, clientSecret } = config.providers.zoom;

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

    return this.mockProvider;
  }
}
