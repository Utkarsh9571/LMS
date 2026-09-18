import { INotificationProvider } from './notification-provider.interface';
import { MockNotificationProvider } from './mock-notification.provider';
import { EmailNotificationProvider } from './email-notification.provider';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { ApplicationError } from '@/lib/errors';

export class NotificationProviderFactory {
  private static mockProvider = new MockNotificationProvider();
  private static emailProvider?: EmailNotificationProvider;

  static getProvider(): INotificationProvider {
    if (config.providers.useMockNotification || (process.env.NOTIFICATION_PROVIDER || 'mock') === 'mock') {
      return this.mockProvider;
    }

    if (process.env.NOTIFICATION_PROVIDER === 'email') {
      if (!this.emailProvider) {
        const { fromEmail, apiKey, apiEndpoint } = config.providers.email;

        if (!fromEmail) {
          throw new ApplicationError(
            '[NotificationProviderFactory] Production email provider requested but missing required EMAIL_FROM.'
          );
        }

        logger.info('[NotificationProviderFactory] Initializing production Email Notification Provider', {
          fromEmail,
          hasApiKey: Boolean(apiKey)
        });

        this.emailProvider = new EmailNotificationProvider({
          fromEmail,
          apiKey,
          apiEndpoint
        });
      }

      return this.emailProvider;
    }

    return this.mockProvider;
  }
}
