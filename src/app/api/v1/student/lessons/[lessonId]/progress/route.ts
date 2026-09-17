import { NextRequest } from 'next/server';
import { requireAuth } from '@/core/services/auth-context.service';
import { ProgressService } from '@/core/services/progress.service';
import { LessonModel } from '@/core/domain/lesson.model';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError, NotFoundError } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const user = await requireAuth();
    const { lessonId } = await params;
    const body = await request.json();

    // Whitelist allowed fields to strictly prevent mass-assignment
    const secondsWatched = typeof body.secondsWatched === 'number' ? body.secondsWatched : undefined;
    const isCompleted = typeof body.isCompleted === 'boolean' ? body.isCompleted : undefined;

    if (secondsWatched === undefined && isCompleted === undefined) {
      throw new ValidationError('Either secondsWatched or isCompleted must be provided.');
    }

    // Resolve courseId from lesson
    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) {
      throw new NotFoundError('Lesson', lessonId);
    }

    const result = await ProgressService.recordLessonProgress(
      user.id,
      lesson.courseId.toString(),
      lessonId,
      {
        secondsWatched,
        isCompleted
      }
    );

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
