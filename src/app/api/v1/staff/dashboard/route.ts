import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { requireAuth } from '@/core/services/auth-context.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AuthorizationError } from '@/lib/errors';
import { OrderModel } from '@/core/domain/order.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { ProductModel } from '@/core/domain/product.model';
import { BatchModel } from '@/core/domain/batch.model';
import { resolveMarketContext } from '@/core/services/market-resolution.service';
import { MarketCode, UserRole } from '@/core/domain/domain-types';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check staff permissions
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

    // Filter by instructor if not global admin
    const batchQuery: any = { marketCode: resolvedMarket };
    if (!isGlobalAdmin && isInstructor) {
      batchQuery.primaryInstructorId = user.id;
    }

    const assignedBatches = await BatchModel.find(batchQuery);
    const assignedBatchIds = assignedBatches.map(b => b._id);

    // 1. Active Students Count
    let activeStudentsCount = 0;
    if (isGlobalAdmin) {
      activeStudentsCount = await EnrollmentModel.countDocuments({ status: 'active' });
    } else {
      activeStudentsCount = await EnrollmentModel.countDocuments({
        batchId: { $in: assignedBatchIds },
        status: 'active'
      });
    }

    // 2. Revenue Calculation (Admin Only)
    let totalRevenueMinorUnits = 0;
    let currency = resolvedMarket === 'SG' ? 'SGD' : 'MYR';
    if (isGlobalAdmin) {
      const revenueAgg = await OrderModel.aggregate([
        { $match: { marketCode: resolvedMarket, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalMinorUnits' } } }
      ]);
      totalRevenueMinorUnits = revenueAgg[0]?.total || 0;
    }

    // 3. Upcoming Workshops / Live Sessions
    const now = new Date();
    const upcomingSessions = await LiveSessionModel.find({
      batchId: { $in: assignedBatchIds },
      startTime: { $gte: now },
      status: { $in: ['scheduled', 'live'] }
    })
      .sort({ startTime: 1 })
      .limit(5);

    // 4. Active Services Count
    const activeServicesCount = isGlobalAdmin
      ? await ProductModel.countDocuments({ isActive: true })
      : 0;

    return apiSuccess({
      metrics: {
        activeStudentsCount,
        totalRevenueMinorUnits,
        currency,
        activeServicesCount,
        isGlobalAdmin
      },
      upcomingSessions: upcomingSessions.map(s => s.toSafeDTO(true))
    });
  } catch (error) {
    return apiError(error);
  }
}
