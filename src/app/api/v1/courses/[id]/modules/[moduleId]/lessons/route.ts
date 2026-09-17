import { NextRequest } from 'next/server';
import { CourseService } from '@/core/services/course.service';
import { requirePermission } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    await requirePermission('courses:write');
    const { id: courseId, moduleId } = await params;
    const body = await request.json();

    const lesson = await CourseService.createLesson(courseId, moduleId, {
      title: body.title,
      order: body.order,
      contentType: body.contentType,
      contentData: body.contentData,
      isPreviewFree: body.isPreviewFree,
      unlockOverrideDays: body.unlockOverrideDays,
      resources: body.resources
    });

    return apiSuccess(lesson, 201);
  } catch (error) {
    return apiError(error);
  }
}
