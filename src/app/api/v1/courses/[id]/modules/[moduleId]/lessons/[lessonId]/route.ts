import { NextRequest } from 'next/server';
import { CourseService } from '@/core/services/course.service';
import { requirePermission } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    await requirePermission('courses:write');
    const { id: courseId, moduleId, lessonId } = await params;
    const body = await request.json();

    const updated = await CourseService.updateLesson(courseId, moduleId, lessonId, {
      title: body.title,
      contentType: body.contentType,
      contentData: body.contentData,
      isPreviewFree: body.isPreviewFree,
      unlockOverrideDays: body.unlockOverrideDays,
      resources: body.resources
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
