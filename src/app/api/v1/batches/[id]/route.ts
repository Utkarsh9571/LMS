import { NextRequest } from 'next/server';
import { BatchService } from '@/core/services/batch.service';
import { requirePermission, getCurrentUser } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AuthorizationError } from '@/lib/errors';
import { UserRole } from '@/core/domain/domain-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const batch = await BatchService.getBatchById(id);

    // If instructor, verify they are assigned or admin
    if (user && user.globalRoles.includes('instructor')) {
      const isGlobalAdmin = user.globalRoles.some((r: UserRole) => ['admin', 'superadmin'].includes(r));
      if (!isGlobalAdmin && batch.primaryInstructorId !== user.id) {
        throw new AuthorizationError('You are not authorized to view this batch.');
      }
    }

    return apiSuccess(batch);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('batches:write');
    const { id } = await params;
    const body = await request.json();

    const updated = await BatchService.updateBatch(id, {
      name: body.name,
      description: body.description,
      status: body.status,
      capacity: body.capacity,
      startDate: body.startDate,
      endDate: body.endDate,
      enrollmentOpenAt: body.enrollmentOpenAt,
      enrollmentCloseAt: body.enrollmentCloseAt,
      primaryInstructorId: body.primaryInstructorId,
      meetingProvider: body.meetingProvider
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
