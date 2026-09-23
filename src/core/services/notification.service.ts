import { NotificationProviderFactory } from '@/providers/notification/notification-provider.factory';
import { INotificationProvider } from '@/providers/notification/notification-provider.interface';
import { MarketCode } from '@/core/domain/domain-types';
import { logger } from '@/lib/logger';

/**
 * Domain Notification Service
 * Renders HTML email templates and dispatches transactional notifications post-commit.
 * Invariants:
 * - Operates safely out-of-band: Provider errors are logged without interrupting LMS database operations.
 * - Sourced strictly via NotificationProviderFactory.
 */
export class NotificationService {
  private static customProvider?: INotificationProvider;

  private static get provider(): INotificationProvider {
    return this.customProvider || NotificationProviderFactory.getProvider();
  }

  public static setProvider(provider: INotificationProvider) {
    this.customProvider = provider;
  }

  /**
   * Dispatches Account Welcome Email
   */
  static async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const subject = 'Welcome to BIM Academy';
    const bodyHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Welcome to BIM Academy, ${escapeHtml(userName)}!</h2>
        <p>Your account has been successfully created. Explore our professional courses and upgrade your skills today.</p>
        <p>Best regards,<br/>The BIM Academy Team</p>
      </div>
    `;
    return this.safeDispatch(userEmail, subject, bodyHtml);
  }

  /**
   * Dispatches Order / Payment Receipt Email
   */
  static async sendPaymentReceipt(
    userEmail: string,
    orderNumber: string,
    formattedAmount: string,
    currency: string,
    itemTitle: string
  ): Promise<boolean> {
    const subject = `Payment Confirmation for Order #${orderNumber}`;
    const bodyHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Payment Received</h2>
        <p>Thank you for your purchase!</p>
        <ul>
          <li><strong>Order Number:</strong> ${escapeHtml(orderNumber)}</li>
          <li><strong>Item:</strong> ${escapeHtml(itemTitle)}</li>
          <li><strong>Total Paid:</strong> ${escapeHtml(formattedAmount)} ${escapeHtml(currency)}</li>
        </ul>
        <p>You can access your course material from your student dashboard.</p>
      </div>
    `;
    return this.safeDispatch(userEmail, subject, bodyHtml);
  }

  /**
   * Dispatches Live Session Scheduled / Reminder Notice
   */
  static async sendLiveSessionNotice(
    userEmail: string,
    sessionTitle: string,
    startTime: Date,
    joinUrl: string,
    marketCode?: MarketCode
  ): Promise<boolean> {
    const timeZone = marketCode === 'MY' ? 'Asia/Kuala_Lumpur' : 'Asia/Singapore';
    const tzLabel = marketCode === 'MY' ? 'MYT' : 'SGT';
    const formattedTime = new Intl.DateTimeFormat('en-SG', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(startTime);

    const subject = `Upcoming Live Class: ${sessionTitle}`;
    const bodyHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Live Classroom Session</h2>
        <p>You have an upcoming live classroom session scheduled:</p>
        <p><strong>Session:</strong> ${escapeHtml(sessionTitle)}<br/>
           <strong>Time:</strong> ${escapeHtml(formattedTime)} (${tzLabel})</p>
        <p><a href="${escapeHtml(joinUrl)}" style="background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Join Classroom</a></p>
      </div>
    `;
    return this.safeDispatch(userEmail, subject, bodyHtml);
  }

  /**
   * Dispatches Certificate Issuance Notice
   */
  static async sendCertificateNotice(
    userEmail: string,
    studentName: string,
    courseTitle: string,
    certificateNumber: string,
    verificationUrl: string
  ): Promise<boolean> {
    const subject = `Congratulations! Certificate Issued for ${courseTitle}`;
    const bodyHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Congratulations, ${escapeHtml(studentName)}!</h2>
        <p>You have successfully completed <strong>${escapeHtml(courseTitle)}</strong>.</p>
        <p><strong>Certificate Number:</strong> ${escapeHtml(certificateNumber)}</p>
        <p><a href="${escapeHtml(verificationUrl)}" style="background: #16a34a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify & View Certificate</a></p>
      </div>
    `;
    return this.safeDispatch(userEmail, subject, bodyHtml);
  }

  /**
   * Dispatches Operational Batch Announcement Email
   */
  static async sendBatchAnnouncement(
    userEmail: string,
    studentName: string,
    batchName: string,
    subject: string,
    messageText: string
  ): Promise<boolean> {
    const safeMsg = escapeHtml(messageText).replace(/\n/g, '<br/>');
    const bodyHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #0f172a;">Announcement for ${escapeHtml(batchName)}</h2>
        <p>Hello ${escapeHtml(studentName)},</p>
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0;">
          <p style="margin: 0; line-height: 1.6;">${safeMsg}</p>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
          Sent by BIM Academy Staff Operations • ${escapeHtml(batchName)}
        </p>
      </div>
    `;
    return this.safeDispatch(userEmail, subject, bodyHtml);
  }

  /**
   * Dispatches Operational Individual Student Email
   */
  static async sendIndividualStudentEmail(
    userEmail: string,
    studentName: string,
    senderName: string,
    subject: string,
    messageText: string
  ): Promise<boolean> {
    const safeMsg = escapeHtml(messageText).replace(/\n/g, '<br/>');
    const bodyHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #0f172a;">Message from ${escapeHtml(senderName)}</h2>
        <p>Hello ${escapeHtml(studentName)},</p>
        <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 15px 0;">
          <p style="margin: 0; line-height: 1.6;">${safeMsg}</p>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
          Direct communication from ${escapeHtml(senderName)} • BIM Academy Staff Workstation
        </p>
      </div>
    `;
    return this.safeDispatch(userEmail, subject, bodyHtml);
  }

  private static async safeDispatch(to: string, subject: string, bodyHtml: string): Promise<boolean> {
    try {
      const result = await this.provider.sendEmail({ to, subject, bodyHtml });
      return result.success;
    } catch (err: any) {
      logger.error('[NotificationService] Unhandled exception during notification dispatch', {
        to,
        error: err.message
      });
      return false;
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
