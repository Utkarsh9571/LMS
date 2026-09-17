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

    const lessons = await CourseService.reorderLessons(courseId, moduleId, body.lessonIds);
    return apiSuccess(lessons);
  } catch (error) {
    return apiError(error);
  }
}
