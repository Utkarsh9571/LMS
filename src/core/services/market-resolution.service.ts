import { config } from '../../lib/config';
import { IMarketSafeContext } from '../domain/domain-types';
import { NotFoundError } from '../../lib/errors';
import { logger } from '../../lib/logger';

export interface MarketResolutionOptions {
  host?: string | null;
  searchParams?: URLSearchParams | null;
  devCookieMarket?: string | null;
  isProductionOverride?: boolean;
}

/**
 * Resolves Market Context strictly according to ARCHITECTURE.md:
 * 
 * In Production:
 * - Hostname/domain is authoritative.
 * - Any query parameter (?market=...), client headers, or dev cookies are IGNORED.
 * - If hostname does not match a registered domain, throws NotFoundError (fail-safe).
 * 
 * In Development:
 * - Allows explicit ?market=SG or ?market=MY
 * - Allows dev switcher cookie
 * - Defaults to host or 'SG'
 */
export function resolveMarketContext(options: MarketResolutionOptions): IMarketSafeContext {
  const isProduction = options.isProductionOverride ?? config.isProduction;
  const host = options.host?.toLowerCase()?.split(':')[0]?.trim() || '';

  if (isProduction) {
    // Production: Host is authoritative
    for (const market of Object.values(config.markets)) {
      if (market.domains.includes(host)) {
        return toSafeMarketContext(market);
      }
    }

    logger.warn('Unknown production domain requested', { host });
    throw new NotFoundError('Market', `domain ${host}`);
  }

  // Development: Check query param ?market= first
  const queryMarket = options.searchParams?.get('market')?.toUpperCase();
  if (queryMarket && (queryMarket === 'SG' || queryMarket === 'MY')) {
    return toSafeMarketContext(config.markets[queryMarket]);
  }

  // Development: Check developer cookie
  const cookieMarket = options.devCookieMarket?.toUpperCase();
  if (cookieMarket && (cookieMarket === 'SG' || cookieMarket === 'MY')) {
    return toSafeMarketContext(config.markets[cookieMarket]);
  }

  // Development: Check if host includes sg or my
  if (host.startsWith('my.')) {
    return toSafeMarketContext(config.markets.MY);
  }
  if (host.startsWith('sg.')) {
    return toSafeMarketContext(config.markets.SG);
  }

  // Development Default
  return toSafeMarketContext(config.markets.SG);
}

function toSafeMarketContext(market: typeof config.markets['SG']): IMarketSafeContext {
  return {
    code: market.code,
    name: market.name,
    countryCode: market.code,
    currency: market.currency,
    currencyMinorUnits: market.currencyMinorUnits,
    timezone: market.timezone,
    domains: market.domains,
    locale: market.locale,
    status: 'active'
  };
}
