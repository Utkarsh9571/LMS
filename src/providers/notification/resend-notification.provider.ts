import {
  INotificationProvider,
  SendEmailParams
} from './notification-provider.interface';
import { logger } from '@/lib/logger';
import { ApplicationError } from '@/lib/errors';

export interface ResendProviderConfig {
  fromEmail: string;
  apiKey: string;
  apiEndpoint?: string;
}

/**
 * Production Resend Transactional Email Notification Adapter
 * Dispatches transactional HTML emails via Resend HTTPS REST API.
 * 
 * Strict Invariants:
 * - providerName is explicitly 'resend'
 * - Requires valid EMAIL_FROM and EMAIL_API_KEY; throws ApplicationError if missing
 * - Never returns { success: true } without actual successful HTTP API dispatch
 */
export class ResendNotificationProvider implements INotificationProvider {
  public readonly providerName = 'resend';

  private readonly config: ResendProviderConfig;

  constructor(config: ResendProviderConfig) {
    if (!config.fromEmail) {
      throw new ApplicationError('[ResendNotificationProvider] Missing required configuration: EMAIL_FROM.');
    }
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new ApplicationError('[ResendNotificationProvider] Missing required configuration: EMAIL_API_KEY.');
    }
    this.config = {
      ...config,
      apiEndpoint: config.apiEndpoint || 'https://api.resend.com/emails'
    };
  }

  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string }> {
    if (!this.config.apiKey) {
      logger.error('[ResendNotificationProvider] Attempted to send email without configured EMAIL_API_KEY.');
      return { success: false };
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
        logger.error('[ResendNotificationProvider] Resend API request failed', {
          status: res.status,
          error: errorText.substring(0, 200)
        });
        return { success: false };
      }

      const data = await res.json();
      const messageId = data.id || `resend_${Date.now()}`;

      logger.info('[ResendNotificationProvider] Resend transactional email successfully dispatched', {
        to: params.to,
        subject: params.subject,
        messageId
      });

      return {
        success: true,
        messageId
      };
    } catch (err: any) {
      logger.error('[ResendNotificationProvider] Network exception during email dispatch', {
        error: err.message
      });
      return { success: false };
    }
  }
}
