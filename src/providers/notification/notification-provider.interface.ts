/**
 * Notification Provider Contract
 * Standard interface for multi-channel messaging (Email, WhatsApp, Mock)
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

export interface SendWhatsAppParams {
  phoneNumber: string;              // E.164 format
  templateName: string;
  parameters: Record<string, string>;
}

export interface INotificationProvider {
  readonly providerName: string;
  sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string }>;
  sendWhatsApp?(params: SendWhatsAppParams): Promise<{ success: boolean; messageId?: string }>;
}
