import {
  INotificationProvider,
  SendEmailParams
} from './notification-provider.interface';
import { logger } from '@/lib/logger';
import { ApplicationError } from '@/lib/errors';

export interface EmailProviderConfig {
  fromEmail: string;
  apiKey?: string;
  apiEndpoint?: string; // Default Resend endpoint: 'https://api.resend.com/emails'
}

/**
 * Production Transactional Email Notification Provider
 * Dispatches transactional HTML emails via HTTPS REST API (Resend / SendGrid / Custom HTTP relay).
 */
export class EmailNotificationProvider implements INotificationProvider {
  public readonly providerName = 'email';

  private readonly config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    if (!config.fromEmail) {
      throw new ApplicationError('Invalid Email Provider configuration: Missing required fromEmail.');
    }
    this.config = {
      ...config,
      apiEndpoint: config.apiEndpoint || 'https://api.resend.com/emails'
    };
  }

  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string }> {
    if (!this.config.apiKey) {
      logger.warn('[EmailNotificationProvider] EMAIL_API_KEY not configured. Falling back to log-only dispatch.');
      return { success: true, messageId: `log_only_${Date.now()}` };
    }

    const payload = {
      from: this.config.fromEmail,
      to: [params.to],
      subject: params.subject,
      html: params.bodyHtml,
      text: params.bodyText
    };

    try {
      const res = await fetch(this.config.apiEndpoint!, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error('[EmailNotificationProvider] External email API request failed', {
          status: res.status,
          error: errorText.substring(0, 200)
        });
        return { success: false };
      }

      const data = await res.json();
      const messageId = data.id || `msg_${Date.now()}`;

      logger.info('[EmailNotificationProvider] Transactional email successfully sent', {
        to: params.to,
        subject: params.subject,
        messageId
      });

      return {
        success: true,
        messageId
      };
    } catch (err: any) {
      logger.error('[EmailNotificationProvider] Exception during email dispatch', {
        error: err.message
      });
      // Email failures do not throw hard ApplicationErrors to preserve core LMS transaction safety
      return { success: false };
    }
  }
}
