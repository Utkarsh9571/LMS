import { NextRequest } from 'next/server';
import { LiveSessionService } from '@/core/services/live-session.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { UserRole } from '@/core/domain/domain-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: sessionId } = await params;

    const isGlobalAdmin = user.globalRoles.some((r: UserRole) => ['admin', 'superadmin'].includes(r));
    const session = await LiveSessionService.getSessionById(sessionId, isGlobalAdmin);
    return apiSuccess(session);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: sessionId } = await params;
    const body = await request.json();

    const updated = await LiveSessionService.updateSession(
      sessionId,
      {
        title: body.title,
        description: body.description,
        status: body.status,
        startTime: body.startTime,
        durationMinutes: body.durationMinutes,
        recordingStatus: body.recordingStatus,
        recordingUrl: body.recordingUrl,
        recordingDurationSeconds: body.recordingDurationSeconds
      },
      user.id
    );

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
