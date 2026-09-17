import { NextRequest } from 'next/server';
import { CourseService } from '@/core/services/course.service';
import { requirePermission } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('courses:write');
    const { id: courseId } = await params;
    const body = await request.json();

    const modules = await CourseService.reorderModules(courseId, body.moduleIds);
    return apiSuccess(modules);
  } catch (error) {
    return apiError(error);
  }
}
