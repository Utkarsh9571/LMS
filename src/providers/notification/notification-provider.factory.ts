import { INotificationProvider } from './notification-provider.interface';
import { MockNotificationProvider } from './mock-notification.provider';
import { ResendNotificationProvider } from './resend-notification.provider';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ApplicationError } from '@/lib/errors';

export class NotificationProviderFactory {
  private static mockProvider = new MockNotificationProvider();
  private static resendProvider?: ResendNotificationProvider;

  static getProvider(providerType?: string): INotificationProvider {
    const rawType = providerType || (config.providers.useMockNotification ? 'mock' : config.providers.notification.provider);
    const targetType = rawType?.toLowerCase().trim();

    if (targetType === 'mock' || (config.providers.useMockNotification && !providerType)) {
      return this.mockProvider;
    }

    if (targetType === 'resend' || targetType === 'email') {
      if (!this.resendProvider) {
        const { fromEmail, apiKey, apiEndpoint } = config.providers.notification;

        if (!fromEmail) {
          throw new ApplicationError(
            '[NotificationProviderFactory] Production Resend provider requested but missing required EMAIL_FROM.'
          );
        }
        if (!apiKey) {
          throw new ApplicationError(
            '[NotificationProviderFactory] Production Resend provider requested but missing required EMAIL_API_KEY.'
          );
        }

        logger.info('[NotificationProviderFactory] Initializing Resend Notification Provider', {
          fromEmail
        });

        this.resendProvider = new ResendNotificationProvider({
          fromEmail,
          apiKey,
          apiEndpoint
        });
      }

      return this.resendProvider;
    }

    // Explicit unsupported/unknown provider must throw ApplicationError (never silently return mock)
    throw new ApplicationError(
      `[NotificationProviderFactory] Unsupported or invalid notification provider: '${providerType || targetType}'.`
    );
  }
}
