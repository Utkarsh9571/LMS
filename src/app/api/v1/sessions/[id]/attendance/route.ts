import { NextRequest } from 'next/server';
import { AttendanceService } from '@/core/services/attendance.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: sessionId } = await params;

    const records = await AttendanceService.listSessionAttendance(sessionId, user.id);
    return apiSuccess(records);
  } catch (error) {
    return apiError(error);
  }
}
