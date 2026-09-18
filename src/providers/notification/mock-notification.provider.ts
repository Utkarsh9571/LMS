import {
  INotificationProvider,
  SendEmailParams,
  SendWhatsAppParams
} from './notification-provider.interface';
import { logger } from '@/lib/logger';

/**
 * Mock Notification Provider Implementation
 * Logs outgoing emails and messages deterministically for testing and local development.
 */
export class MockNotificationProvider implements INotificationProvider {
  public readonly providerName = 'mock';

  public sentEmails: SendEmailParams[] = [];
  public sentWhatsAppMessages: SendWhatsAppParams[] = [];

  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string }> {
    const messageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.sentEmails.push(params);

    logger.info('[MockNotificationProvider] Outgoing email dispatched', {
      to: params.to,
      subject: params.subject,
      messageId
    });

    return {
      success: true,
      messageId
    };
  }

  async sendWhatsApp(params: SendWhatsAppParams): Promise<{ success: boolean; messageId?: string }> {
    const messageId = `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.sentWhatsAppMessages.push(params);

    logger.info('[MockNotificationProvider] Outgoing WhatsApp message dispatched', {
      phoneNumber: params.phoneNumber,
      templateName: params.templateName,
      messageId
    });

    return {
      success: true,
      messageId
    };
  }
}
