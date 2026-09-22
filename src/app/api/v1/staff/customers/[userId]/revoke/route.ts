import { NextRequest } from 'next/server';
import { StaffManagementService } from '@/core/services/staff-management.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AuthorizationError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/core/domain/domain-types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireAuth();
    const { userId } = await params;

    const isGlobalAdmin = user.globalRoles.some((r: UserRole) => ['admin', 'superadmin'].includes(r));
    if (!isGlobalAdmin) {
      return apiError(new AuthorizationError('Requires global admin privileges to revoke customer access.'));
    }

    const body = await request.json();
    const { entitlementId } = body;

    if (!entitlementId || typeof entitlementId !== 'string') {
      return apiError(new ValidationError('entitlementId is required and must be a string.'));
    }

    const result = await StaffManagementService.revokeManualAccess({
      callerId: user.id,
      targetUserId: userId,
      entitlementId
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
