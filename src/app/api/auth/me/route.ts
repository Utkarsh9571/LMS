import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuth();
    return apiSuccess(user);
  } catch (error) {
    return apiError(error);
  }
}
