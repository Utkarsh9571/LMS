import { NextRequest } from 'next/server';
import { ServiceManagementService } from '@/core/services/service-management.service';
import { requirePermission, getCurrentUser } from '@/core/services/auth-context.service';
import { resolveMarketContext } from '@/core/services/market-resolution.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AuthenticationError } from '@/lib/errors';
import { MarketCode } from '@/core/domain/domain-types';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError(new AuthenticationError('Authentication required.'));
    }

    const headerMarket = request.headers.get('x-market-code') as MarketCode | null;
    const resolvedMarket =
      headerMarket ||
      resolveMarketContext({
        host: request.headers.get('host'),
        searchParams: request.nextUrl.searchParams,
        devCookieMarket: request.cookies.get('lms_dev_market')?.value
      }).code;

    const services = await ServiceManagementService.listServices(resolvedMarket);
    return apiSuccess(services);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Requires commerce:write permission (Admin / Superadmin)
    const user = await requirePermission('commerce:write');
    const headerMarket = request.headers.get('x-market-code') as MarketCode | null;
    const resolvedMarket =
      headerMarket ||
      resolveMarketContext({
        host: request.headers.get('host'),
        searchParams: request.nextUrl.searchParams,
        devCookieMarket: request.cookies.get('lms_dev_market')?.value
      }).code;

    const body = await request.json();

    const service = await ServiceManagementService.createService({
      title: body.title,
      description: body.description,
      slug: body.slug,
      deliverableType: body.deliverableType,
      targetId: body.targetId,
      marketCode: resolvedMarket,
      currency: body.currency || (resolvedMarket === 'SG' ? 'SGD' : 'MYR'),
      priceMinorUnits: body.priceMinorUnits,
      displayOriginalPriceMinorUnits: body.displayOriginalPriceMinorUnits,
      isPubliclyListed: body.isPubliclyListed !== false
    });

    return apiSuccess(service, 201);
  } catch (error) {
    return apiError(error);
  }
}
