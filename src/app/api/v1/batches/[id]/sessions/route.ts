import { NextRequest } from 'next/server';
import { LiveSessionService } from '@/core/services/live-session.service';
import { requireAuth, getCurrentUser } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { UserRole } from '@/core/domain/domain-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;
    const user = await getCurrentUser();

    // Check if caller is privileged to see hostUrl (admin or assigned instructor)
    let includeHostUrl = false;
    if (user) {
      const isGlobalAdmin = user.globalRoles.some((r: UserRole) => ['admin', 'superadmin'].includes(r));
      if (isGlobalAdmin) {
        includeHostUrl = true;
      } else if (user.globalRoles.includes('instructor')) {
        const { BatchModel } = await import('@/core/domain/batch.model');
        const batch = await BatchModel.findById(batchId);
        if (batch && batch.primaryInstructorId.toString() === user.id) {
          includeHostUrl = true;
        }
      }
    }

    const sessions = await LiveSessionService.listSessionsForBatch(batchId, includeHostUrl);
    return apiSuccess(sessions);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: batchId } = await params;
    const body = await request.json();

    const session = await LiveSessionService.createSession(
      {
        batchId,
        title: body.title,
        description: body.description,
        startTime: body.startTime,
        durationMinutes: body.durationMinutes
      },
      user.id
    );

    return apiSuccess(session, 201);
  } catch (error) {
    return apiError(error);
  }
}
