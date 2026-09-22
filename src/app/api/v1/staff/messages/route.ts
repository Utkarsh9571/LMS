import { NextRequest } from 'next/server';
import { StaffMessagingService } from '@/core/services/staff-messaging.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { action, sessionId, batchId, targetUserId, subject, message } = body;

    if (action === 'workshop_reminder') {
      if (!sessionId || typeof sessionId !== 'string') {
        throw new ValidationError('Session ID is required.');
      }
      const result = await StaffMessagingService.sendWorkshopReminder({
        sessionId,
        callerId: user.id
      });
      return apiSuccess(result);
    }

    if (action === 'batch_announcement') {
      if (!batchId || typeof batchId !== 'string') {
        throw new ValidationError('Batch ID is required.');
      }
      const result = await StaffMessagingService.sendBatchAnnouncement({
        batchId,
        subject: subject || '',
        message: message || '',
        callerId: user.id
      });
      return apiSuccess(result);
    }

    if (action === 'individual_email') {
      if (!targetUserId || typeof targetUserId !== 'string') {
        throw new ValidationError('Target User ID is required.');
      }
      const result = await StaffMessagingService.sendIndividualStudentEmail({
        targetUserId,
        subject: subject || '',
        message: message || '',
        callerId: user.id
      });
      return apiSuccess(result);
    }

    throw new ValidationError('Invalid operational message action.');
  } catch (error) {
    return apiError(error);
  }
}
