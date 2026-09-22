import { NextRequest } from 'next/server';
import { OrderService } from '@/core/services/order.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await requireAuth();
    const { orderNumber } = await context.params;
    const order = await OrderService.getOrderForUser(orderNumber, user.id);
    return apiSuccess(order);
  } catch (error) {
    return apiError(error);
  }
}
