import { NextRequest } from 'next/server';
import { requireAuth } from '@/core/services/auth-context.service';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { BatchModel } from '@/core/domain/batch.model';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { CourseModel } from '@/core/domain/course.model';
import { UserModel } from '@/core/domain/user.model';
import { apiSuccess, apiError } from '@/lib/api-response';
import { NotFoundError, AuthorizationError } from '@/lib/errors';
import { connectToDatabase } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: batchId } = await params;

    await connectToDatabase();
    const batch = await BatchModel.findById(batchId);
    if (!batch) throw new NotFoundError('Batch', batchId);

    // Verify active enrollment in this batch
    const enrollment = await EnrollmentModel.findOne({
      userId: user.id,
      batchId: batch._id,
      status: 'active'
    });

    if (!enrollment) {
      throw new AuthorizationError('You are not enrolled in this batch.');
    }

    const course = await CourseModel.findById(batch.courseId);
    const instructor = await UserModel.findById(batch.primaryInstructorId).select('fullName email avatarUrl');
    const sessions = await LiveSessionModel.find({ batchId: batch._id }).sort({ startTime: 1 });

    return apiSuccess({
      batch: batch.toSafeDTO(),
      course: course ? { id: course._id.toString(), title: course.title, slug: course.slug } : null,
      instructor: instructor ? { id: instructor._id.toString(), fullName: instructor.fullName } : null,
      enrollment: enrollment.toSafeDTO(),
      sessions: sessions.map(s => s.toSafeDTO(false)) // Student view: hostUrl stripped
    });
  } catch (error) {
    return apiError(error);
  }
}
