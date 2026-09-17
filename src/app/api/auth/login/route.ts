import { NextRequest } from 'next/server';
import { AuthService } from '@/core/services/auth.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await AuthService.login({
      email: body.email,
      password: body.password
    });

    return apiSuccess(user, 200);
  } catch (error) {
    return apiError(error);
  }
}
