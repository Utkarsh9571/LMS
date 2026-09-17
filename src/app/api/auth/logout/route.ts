import { AuthService } from '@/core/services/auth.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST() {
  try {
    await AuthService.logout();
    return apiSuccess({ message: 'Logged out successfully' });
  } catch (error) {
    return apiError(error);
  }
}
