import { NextRequest } from 'next/server';
import { requireAuth } from '@/core/services/auth-context.service';
import { assertPermission } from '@/core/services/rbac.service';
import { OrderService } from '@/core/services/order.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await requireAuth();
    assertPermission(user.globalRoles, 'orders:write');

    const { orderId } = await params;

    const result = await OrderService.cancelPendingOrder({
      orderId,
      callerId: user.id
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
