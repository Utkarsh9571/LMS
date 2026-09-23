import { NextRequest } from 'next/server';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { BatchModel } from '@/core/domain/batch.model';
import { CourseModel } from '@/core/domain/course.model';
import { AttendanceModel } from '@/core/domain/attendance.model';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AuthorizationError } from '@/lib/errors';
import { resolveMarketContext } from '@/core/services/market-resolution.service';
import { MarketCode, UserRole } from '@/core/domain/domain-types';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const isGlobalAdmin = user.globalRoles.some((r: UserRole) => ['admin', 'superadmin'].includes(r));
    const isInstructor = user.globalRoles.includes('instructor');

    if (!isGlobalAdmin && !isInstructor) {
      return apiError(new AuthorizationError('Requires staff privileges.'));
    }

    await connectToDatabase();

    const headerMarket = request.headers.get('x-market-code') as MarketCode | null;
    const resolvedMarket =
      headerMarket ||
      resolveMarketContext({
        host: request.headers.get('host'),
        searchParams: request.nextUrl.searchParams,
        devCookieMarket: request.cookies.get('lms_dev_market')?.value
      }).code;

    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status'); // 'upcoming' | 'completed' | all
    const courseIdFilter = searchParams.get('courseId');
    const batchIdFilter = searchParams.get('batchId');

    // Resolve accessible batches
    const batchQuery: any = { marketCode: resolvedMarket };
    if (batchIdFilter) batchQuery._id = batchIdFilter;
    if (courseIdFilter) batchQuery.courseId = courseIdFilter;
    if (!isGlobalAdmin && isInstructor) {
      batchQuery.primaryInstructorId = user.id;
    }

    const batches = await BatchModel.find(batchQuery);
    const batchMap = new Map(batches.map(b => [b._id.toString(), b]));
    const batchIds = Array.from(batchMap.keys());

    if (batchIds.length === 0) {
      return apiSuccess([]);
    }

    const sessionQuery: any = { batchId: { $in: batchIds } };
    const now = new Date();

    if (statusFilter === 'upcoming') {
      sessionQuery.$or = [
        { startTime: { $gte: now } },
        { status: { $in: ['scheduled', 'live'] } }
      ];
    } else if (statusFilter === 'completed') {
      sessionQuery.$or = [
        { endTime: { $lt: now } },
        { status: 'completed' }
      ];
    }

    const sessions = await LiveSessionModel.find(sessionQuery).sort({ startTime: 1 });

    // Pre-fetch courses for title resolution
    const courseIds = Array.from(new Set(batches.map(b => b.courseId.toString())));
    const courses = courseIds.length > 0 ? await CourseModel.find({ _id: { $in: courseIds } }) : [];
    const courseMap = new Map(courses.map(c => [c._id.toString(), c.title]));

    // Aggregated Attendance Count per Session
    const sessionIds = sessions.map(s => s._id);
    const attendanceAgg = sessionIds.length > 0
      ? await AttendanceModel.aggregate([
          { $match: { liveSessionId: { $in: sessionIds } } },
          { $group: { _id: '$liveSessionId', count: { $sum: 1 } } }
        ])
      : [];

    const attendanceMap = new Map(attendanceAgg.map(a => [a._id.toString(), a.count]));

    const formattedWorkshops = sessions.map(s => {
      const parentBatch = batchMap.get(s.batchId.toString());
      const courseTitle = parentBatch ? courseMap.get(parentBatch.courseId.toString()) || 'Unknown Program' : 'Unknown Program';
      const safeDTO = s.toSafeDTO(true); // Privileged: includes hostUrl

      return {
        ...safeDTO,
        marketCode: parentBatch ? parentBatch.marketCode : 'SG',
        programTitle: courseTitle,
        batchName: parentBatch ? parentBatch.name : 'Unknown Batch',
        batchCode: parentBatch ? parentBatch.code : '',
        batchCapacity: parentBatch ? parentBatch.capacity : 0,
        enrolledCount: parentBatch ? parentBatch.enrolledCount : 0,
        attendeeCount: attendanceMap.get(s._id.toString()) || 0
      };
    });

    return apiSuccess(formattedWorkshops);
  } catch (error) {
    return apiError(error);
  }
}
