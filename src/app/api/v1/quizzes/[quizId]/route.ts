import { NextRequest } from 'next/server';
import { QuizService } from '@/core/services/quiz.service';
import { requirePermission } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    await requirePermission('courses:write');
    const { quizId } = await params;
    const quiz = await QuizService.getQuizForAuthoring(quizId);
    return apiSuccess(quiz);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    await requirePermission('courses:write');
    const { quizId } = await params;
    const body = await request.json();

    const quiz = await QuizService.updateQuiz(quizId, {
      title: body.title,
      description: body.description,
      status: body.status,
      passingScorePercent: body.passingScorePercent,
      timeLimitMinutes: body.timeLimitMinutes,
      maxAttempts: body.maxAttempts,
      shuffleQuestions: body.shuffleQuestions,
      shuffleOptions: body.shuffleOptions,
      questions: body.questions
    });

    return apiSuccess(quiz);
  } catch (error) {
    return apiError(error);
  }
}
