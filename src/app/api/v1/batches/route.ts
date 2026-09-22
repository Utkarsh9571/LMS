import { NextRequest } from 'next/server';
import { BatchService } from '@/core/services/batch.service';
import { BatchStatus, MarketCode, UserRole } from '@/core/domain/domain-types';
import { requirePermission, getCurrentUser } from '@/core/services/auth-context.service';
import { resolveMarketContext } from '@/core/services/market-resolution.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const resolvedMarket = resolveMarketContext({
      host: request.headers.get('host'),
      searchParams: request.nextUrl.searchParams,
      devCookieMarket: request.cookies.get('lms_dev_market')?.value
    }).code;

    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId') || undefined;
    const statusParam = searchParams.get('status') as BatchStatus | null;
    const validStatuses: BatchStatus[] = ['draft', 'upcoming', 'enrolling', 'in_progress', 'completed', 'cancelled'];
    const status = statusParam && validStatuses.includes(statusParam) ? statusParam : undefined;

    // RBAC & Market filtering
    let instructorFilter: string | undefined;
    if (user && user.globalRoles.includes('instructor')) {
      const isGlobalAdmin = user.globalRoles.some((r: UserRole) => ['admin', 'superadmin'].includes(r));
      if (!isGlobalAdmin) {
        instructorFilter = user.id;
      }
    }

    const batches = await BatchService.listBatches({
      courseId,
      marketCode: resolvedMarket,
      status,
      primaryInstructorId: instructorFilter
    });

    return apiSuccess(batches);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Requires batches:write permission (Admin / Superadmin)
    const user = await requirePermission('batches:write');
    const headerMarket = request.headers.get('x-market-code') as MarketCode | null;
    const resolvedMarket =
      headerMarket ||
      resolveMarketContext({
        host: request.headers.get('host'),
        searchParams: request.nextUrl.searchParams,
        devCookieMarket: request.cookies.get('lms_dev_market')?.value
      }).code;

    const body = await request.json();

    const batch = await BatchService.createBatch({
      courseId: body.courseId,
      marketCode: resolvedMarket, // Authoritative market context enforced
      code: body.code,
      name: body.name,
      description: body.description,
      capacity: body.capacity,
      startDate: body.startDate,
      endDate: body.endDate,
      enrollmentOpenAt: body.enrollmentOpenAt,
      enrollmentCloseAt: body.enrollmentCloseAt,
      primaryInstructorId: body.primaryInstructorId || user.id,
      meetingProvider: body.meetingProvider
    });

    return apiSuccess(batch, 201);
  } catch (error) {
    return apiError(error);
  }
}
