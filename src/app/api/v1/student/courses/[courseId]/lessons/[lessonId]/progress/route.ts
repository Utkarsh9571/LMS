import { NextRequest } from 'next/server';
import { requireAuth } from '@/core/services/auth-context.service';
import { ProgressService } from '@/core/services/progress.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  try {
    const user = await requireAuth();
    const { courseId, lessonId } = await params;
    const body = await request.json();

    // Whitelist allowed fields to strictly prevent mass-assignment
    const secondsWatched = typeof body.secondsWatched === 'number' ? body.secondsWatched : undefined;
    const isCompleted = typeof body.isCompleted === 'boolean' ? body.isCompleted : undefined;

    if (secondsWatched === undefined && isCompleted === undefined) {
      throw new ValidationError('Either secondsWatched or isCompleted must be provided.');
    }

    const result = await ProgressService.recordLessonProgress(
      user.id,
      courseId,
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
