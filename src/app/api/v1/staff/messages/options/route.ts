import { NextRequest } from 'next/server';
import { StaffMessagingService } from '@/core/services/staff-messaging.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const options = await StaffMessagingService.getMessageOptions(user.id);
    return apiSuccess(options);
  } catch (error) {
    return apiError(error);
  }
}
