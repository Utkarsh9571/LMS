import { NextRequest } from 'next/server';
import { CourseService } from '@/core/services/course.service';
import { requirePermission } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await CourseService.getCourse(id);
    return apiSuccess(course);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('courses:write');
    const { id } = await params;
    const body = await request.json();

    const updated = await CourseService.updateCourse(id, {
      title: body.title,
      description: body.description,
      level: body.level,
      thumbnailUrl: body.thumbnailUrl,
      status: body.status,
      deliveryModes: body.deliveryModes,
      estimatedHours: body.estimatedHours
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
