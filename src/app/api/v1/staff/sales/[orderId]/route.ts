import { NextRequest } from 'next/server';
import { StaffManagementService } from '@/core/services/staff-management.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AuthorizationError } from '@/lib/errors';
import { UserRole } from '@/core/domain/domain-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await requireAuth();
    const { orderId } = await params;

    // Authoritative RBAC assertion: Order detail requires global Admin/Superadmin privilege
    const isGlobalAdmin = user.globalRoles.some((r: UserRole) => ['admin', 'superadmin'].includes(r));
    if (!isGlobalAdmin) {
      return apiError(new AuthorizationError('Requires admin privileges to view sales details.'));
    }

    const salesDetail = await StaffManagementService.getSalesDetail(orderId);
    return apiSuccess(salesDetail);
  } catch (error) {
    return apiError(error);
  }
}
