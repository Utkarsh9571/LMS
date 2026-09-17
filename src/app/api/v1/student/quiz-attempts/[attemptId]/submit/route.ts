import { NextRequest } from 'next/server';
import { QuizService } from '@/core/services/quiz.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const user = await requireAuth();
    const { attemptId } = await params;
    const body = await request.json();

    const result = await QuizService.submitAttempt(user.id, attemptId, body.answers || []);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
