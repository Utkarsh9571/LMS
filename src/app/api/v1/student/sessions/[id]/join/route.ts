import { NextRequest } from 'next/server';
import { AttendanceService } from '@/core/services/attendance.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: sessionId } = await params;

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;

    const result = await AttendanceService.joinSession(sessionId, user.id, ipAddress);

    return apiSuccess({
      studentJoinUrl: result.studentJoinUrl,
      attendance: result.attendance
    });
  } catch (error) {
    return apiError(error);
  }
}
