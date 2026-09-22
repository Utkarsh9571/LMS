import { NextRequest } from 'next/server';
import { StaffManagementService } from '@/core/services/staff-management.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AuthorizationError } from '@/lib/errors';
import { UserRole } from '@/core/domain/domain-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireAuth();
    const { userId } = await params;

    // Authoritative RBAC assertion: Customer 360 requires global Admin/Superadmin privilege
    const isGlobalAdmin = user.globalRoles.some((r: UserRole) => ['admin', 'superadmin'].includes(r));
    if (!isGlobalAdmin) {
      return apiError(new AuthorizationError('Requires admin privileges to view customer profiles.'));
    }

    const customer360 = await StaffManagementService.getCustomer360(userId);
    return apiSuccess(customer360);
  } catch (error) {
    return apiError(error);
  }
}
