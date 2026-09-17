import { NextRequest } from 'next/server';
import { AttendanceService } from '@/core/services/attendance.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: sessionId, userId: targetUserId } = await params;
    const body = await request.json();

    const updated = await AttendanceService.updateAttendanceStatus(
      sessionId,
      targetUserId,
      body.status,
      user.id
    );

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
