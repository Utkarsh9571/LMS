import { NextRequest } from 'next/server';
import { QuizService } from '@/core/services/quiz.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const user = await requireAuth();
    const { quizId } = await params;
    const body = await request.json();

    const result = await QuizService.startAttempt(user.id, body.enrollmentId, quizId);
    return apiSuccess(result, 201);
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const user = await requireAuth();
    const { quizId } = await params;
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollmentId');

    if (!enrollmentId) {
      return apiError(new Error('enrollmentId query parameter is required.'));
    }

    // getStudentAttempts validates enrollment ownership and returns DTOs without userId
    const attempts = await QuizService.getStudentAttempts(user.id, enrollmentId, quizId);
    return apiSuccess(attempts);
  } catch (error) {
    return apiError(error);
  }
}
