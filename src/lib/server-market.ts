import { headers, cookies } from 'next/headers';
import { MarketCode } from '@/core/domain/domain-types';
import { resolveMarketContext } from '@/core/services/market-resolution.service';

/**
 * Resolves the market code for the current Server Component request.
 * Uses the trusted x-market-code header set by middleware, with fallback to resolveMarketContext.
 */
export async function getResolvedMarketCode(
  searchParamsObj?: Record<string, string | string[] | undefined> | null
): Promise<MarketCode> {
  const reqHeaders = await headers();
  const headerMarket = reqHeaders.get('x-market-code') as MarketCode | null;

  if (headerMarket && (headerMarket === 'SG' || headerMarket === 'MY')) {
    return headerMarket;
  }

  const reqCookies = await cookies();
  const host = reqHeaders.get('host');
  const devCookieMarket = reqCookies.get('lms_dev_market')?.value;

  let searchParams: URLSearchParams | null = null;
  if (searchParamsObj) {
    searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParamsObj)) {
      if (typeof v === 'string') {
        searchParams.set(k, v);
      }
    }
  }

  const resolved = resolveMarketContext({
    host,
    searchParams,
    devCookieMarket,
  });

  return resolved.code;
}
