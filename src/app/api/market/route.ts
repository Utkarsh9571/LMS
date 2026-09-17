import { NextRequest } from 'next/server';
import { resolveMarketContext } from '@/core/services/market-resolution.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const market = resolveMarketContext({
      host: request.headers.get('host'),
      searchParams: request.nextUrl.searchParams,
      devCookieMarket: request.cookies.get('lms_dev_market')?.value
    });

    return apiSuccess(market);
  } catch (error) {
    return apiError(error);
  }
}
