import { NextRequest } from 'next/server';
import { QuizService } from '@/core/services/quiz.service';
import { requirePermission } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await requirePermission('courses:write');
    const body = await request.json();

    const quiz = await QuizService.createQuiz({
      courseId: body.courseId,
      lessonId: body.lessonId,
      title: body.title,
      description: body.description,
      passingScorePercent: body.passingScorePercent,
      timeLimitMinutes: body.timeLimitMinutes,
      maxAttempts: body.maxAttempts,
      shuffleQuestions: body.shuffleQuestions,
      shuffleOptions: body.shuffleOptions,
      questions: body.questions
    });

    return apiSuccess(quiz, 201);
  } catch (error) {
    return apiError(error);
  }
}
