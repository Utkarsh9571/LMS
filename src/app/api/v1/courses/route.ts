import { NextRequest } from 'next/server';
import { CourseService } from '@/core/services/course.service';
import { CourseStatus } from '@/core/domain/domain-types';
import { requirePermission } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get('status') as CourseStatus | null;
    const validStatuses: CourseStatus[] = ['draft', 'published', 'archived'];
    const status = statusParam && validStatuses.includes(statusParam) ? statusParam : undefined;
    const courses = await CourseService.listCourses(status ? { status } : undefined);
    return apiSuccess(courses);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Requires RBAC courses:write permission
    await requirePermission('courses:write');

    const body = await request.json();
    const course = await CourseService.createCourse({
      slug: body.slug,
      title: body.title,
      description: body.description,
      level: body.level,
      thumbnailUrl: body.thumbnailUrl,
      status: body.status,
      deliveryModes: body.deliveryModes,
      estimatedHours: body.estimatedHours
    });

    return apiSuccess(course, 201);
  } catch (error) {
    return apiError(error);
  }
}
