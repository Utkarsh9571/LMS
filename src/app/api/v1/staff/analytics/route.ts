import { NextRequest } from 'next/server';
import { StaffAnalyticsService } from '@/core/services/staff-analytics.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const analytics = await StaffAnalyticsService.getAnalytics(user.id);
    return apiSuccess(analytics);
  } catch (error) {
    return apiError(error);
  }
}
