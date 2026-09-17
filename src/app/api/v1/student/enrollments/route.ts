import { NextRequest } from 'next/server';
import { requireAuth } from '@/core/services/auth-context.service';
import { EnrollmentService } from '@/core/services/enrollment.service';
import { CourseModel } from '@/core/domain/course.model';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();
    const enrollments = await EnrollmentService.getStudentEnrollments(user.id);

    // Populate course metadata for student dashboard view
    const courseIds = enrollments.map(e => e.courseId);
    const courses = await CourseModel.find({ _id: { $in: courseIds } });
    const courseMap = new Map(courses.map(c => [c._id.toString(), c.toSafeDTO()]));

    const enriched = enrollments.map(e => ({
      ...e,
      course: courseMap.get(e.courseId) || null
    }));

    return apiSuccess(enriched);
  } catch (error) {
    return apiError(error);
  }
}
