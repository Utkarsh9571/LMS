import { NextRequest } from 'next/server';
import { OrderService } from '@/core/services/order.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    // 1. Authenticate user strictly from session
    const user = await requireAuth();

    // 2. Resolve orderNumber from route params
    const { orderNumber } = await context.params;

    // 3. Retry payment
    const result = await OrderService.retryPayment(orderNumber, user.id);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
