import { NextRequest } from 'next/server';
import { StaffManagementService } from '@/core/services/staff-management.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { resolveMarketContext } from '@/core/services/market-resolution.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AuthorizationError } from '@/lib/errors';
import { MarketCode, UserRole } from '@/core/domain/domain-types';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Authoritative RBAC assertion: Sales ledger requires global Admin/Superadmin privilege
    const isGlobalAdmin = user.globalRoles.some((r: UserRole) => ['admin', 'superadmin'].includes(r));
    if (!isGlobalAdmin) {
      return apiError(new AuthorizationError('Requires admin privileges to access sales ledger.'));
    }

    const headerMarket = request.headers.get('x-market-code') as MarketCode | null;
    const resolvedMarket =
      headerMarket ||
      resolveMarketContext({
        host: request.headers.get('host'),
        searchParams: request.nextUrl.searchParams,
        devCookieMarket: request.cookies.get('lms_dev_market')?.value
      }).code;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const marketCodeParam = searchParams.get('marketCode') || resolvedMarket;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const result = await StaffManagementService.listSales({
      search,
      status,
      marketCode: marketCodeParam,
      page,
      limit
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
