import { NextRequest } from 'next/server';
import { AuthService } from '@/core/services/auth.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await AuthService.register({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      phone: body.phone,
      marketCode: body.marketCode
    });

    return apiSuccess(user, 201);
  } catch (error) {
    return apiError(error);
  }
}
