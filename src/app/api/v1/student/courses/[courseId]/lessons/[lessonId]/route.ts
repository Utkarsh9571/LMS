import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/core/services/auth-context.service';
import { LessonModel } from '@/core/domain/lesson.model';
import { AccessService } from '@/core/services/access.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { NotFoundError } from '@/lib/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  try {
    const { courseId, lessonId } = await params;
    const user = await getCurrentUser();

    const lesson = await LessonModel.findOne({ _id: lessonId, courseId });
    if (!lesson) {
      throw new NotFoundError('Lesson in Course', `${lessonId} in Course ${courseId}`);
    }

    // Free preview lessons can be accessed publicly; protected lessons require access check
    if (!lesson.isPreviewFree) {
      if (!user) {
        await AccessService.requireLessonAccess('', lessonId); // Will throw Authentication/Authorization
      } else {
        await AccessService.requireLessonAccess(user.id, lessonId);
      }
    }

    return apiSuccess(lesson.toSafeDTO());
  } catch (error) {
    return apiError(error);
  }
}
