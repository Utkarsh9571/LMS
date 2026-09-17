import { NextRequest } from 'next/server';
import { requireAuth } from '@/core/services/auth-context.service';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { BatchModel } from '@/core/domain/batch.model';
import { AttendanceModel } from '@/core/domain/attendance.model';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AuthorizationError, NotFoundError } from '@/lib/errors';
import { connectToDatabase } from '@/lib/db';
import { UserRole } from '@/core/domain/domain-types';

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

    const isGlobalAdmin = user.globalRoles.some((r: UserRole) => ['admin', 'superadmin', 'staff'].includes(r));
    const isAssignedInstructor = batch.primaryInstructorId.toString() === user.id;

    if (!isGlobalAdmin && !isAssignedInstructor) {
      throw new AuthorizationError('You are not authorized to view the roster for this batch.');
    }

    const enrollments = await EnrollmentModel.find({
      batchId: batch._id,
      status: 'active'
    }).populate('userId', 'fullName email avatarUrl');

    const roster = await Promise.all(
      enrollments.map(async e => {
        const studentUser: any = e.userId;
        const attendanceCount = await AttendanceModel.countDocuments({
          batchId: batch._id,
          userId: studentUser._id,
          status: 'present'
        });

        return {
          enrollmentId: e._id.toString(),
          userId: studentUser._id.toString(),
          fullName: studentUser.fullName,
          email: studentUser.email,
          enrolledAt: e.enrolledAt.toISOString(),
          progressPercent: e.progressPercent,
          attendanceCount
        };
      })
    );

    return apiSuccess({
      batchId: batch._id.toString(),
      batchCode: batch.code,
      batchName: batch.name,
      totalEnrolled: roster.length,
      capacity: batch.capacity,
      roster
    });
  } catch (error) {
    return apiError(error);
  }
}
