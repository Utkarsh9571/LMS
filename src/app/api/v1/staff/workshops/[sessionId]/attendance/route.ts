import { NextRequest } from 'next/server';
import { AttendanceService } from '@/core/services/attendance.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors';
import { AttendanceStatus } from '@/core/domain/domain-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await requireAuth();
    const { sessionId } = await params;

    const workspace = await AttendanceService.getSessionAttendanceWorkspace(sessionId, user.id);
    return apiSuccess(workspace);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await requireAuth();
    const { sessionId } = await params;

    const body = await request.json();
    const { targetUserId, status } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      throw new ValidationError('Target user ID is required.');
    }

    if (!['present', 'late', 'absent', 'excused'].includes(status)) {
      throw new ValidationError('Invalid attendance status.');
    }

    const updated = await AttendanceService.updateAttendanceStatus(
      sessionId,
      targetUserId,
      status as AttendanceStatus,
      user.id
    );

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
