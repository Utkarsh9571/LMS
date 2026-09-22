import { NextRequest } from 'next/server';
import { MarketCode } from '@/core/domain/domain-types';
import { resolveMarketContext } from '@/core/services/market-resolution.service';
import { StoreDiscoveryService } from '@/core/services/store-discovery.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export type { IStoreOfferDiscoveryDTO, IStoreProductDiscoveryDTO } from '@/core/services/store-discovery.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseIdParam = searchParams.get('courseId');

    // Resolve the market from the authoritative server context. Ignore client market headers.
    const resolvedMarketCode: MarketCode = resolveMarketContext({
      host: request.headers.get('host'),
      searchParams: request.nextUrl.searchParams,
      devCookieMarket: request.cookies.get('lms_dev_market')?.value
    }).code;

    const discoveryResults = await StoreDiscoveryService.getProductOffersForMarket(
      resolvedMarketCode,
      courseIdParam || undefined
    );

    return apiSuccess(discoveryResults);
  } catch (error) {
    return apiError(error);
  }
}