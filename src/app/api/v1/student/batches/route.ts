import { NextRequest } from 'next/server';
import { requireAuth } from '@/core/services/auth-context.service';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { BatchModel } from '@/core/domain/batch.model';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { apiSuccess, apiError } from '@/lib/api-response';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    await connectToDatabase();

    // Find all active cohort enrollments for this student
    const enrollments = await EnrollmentModel.find({
      userId: user.id,
      batchId: { $ne: null },
      status: 'active'
    });

    const batchIds = enrollments.map(e => e.batchId);
    const batches = await BatchModel.find({ _id: { $in: batchIds } });

    // Populate with next upcoming live class
    const now = new Date();
    const result = await Promise.all(
      batches.map(async b => {
        const nextSession = await LiveSessionModel.findOne({
          batchId: b._id,
          status: { $in: ['scheduled', 'live'] },
          endTime: { $gt: now }
        }).sort({ startTime: 1 });

        return {
          ...b.toSafeDTO(),
          enrollment: enrollments.find(e => e.batchId?.toString() === b._id.toString())?.toSafeDTO(),
          nextLiveSession: nextSession ? nextSession.toSafeDTO(false) : null
        };
      })
    );

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
