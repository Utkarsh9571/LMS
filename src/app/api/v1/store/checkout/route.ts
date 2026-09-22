import { NextRequest } from 'next/server';
import { OrderService } from '@/core/services/order.service';
import { requireAuth } from '@/core/services/auth-context.service';
import { resolveMarketContext } from '@/core/services/market-resolution.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors';
import { MarketCode } from '@/core/domain/domain-types';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user strictly from session cookie
    const user = await requireAuth();

    // 2. Resolve the market from the authoritative server context.
    // Client-supplied x-market-code is intentionally ignored in production.
    const resolvedMarket = resolveMarketContext({
        host: request.headers.get('host'),
        searchParams: request.nextUrl.searchParams,
        devCookieMarket: request.cookies.get('lms_dev_market')?.value
      }).code;


    // 3. Whitelist and validate input body
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      throw new ValidationError('Invalid request body.');
    }

    const { productId, batchId, couponCode, billingDetails } = body;

    // 4. Create Order & Initiate Payment Attempt
    const result = await OrderService.createCheckoutOrder(user.id, resolvedMarket, {
      productId,
      batchId: typeof batchId === 'string' ? batchId : undefined,
      returnBaseUrl: request.nextUrl.origin,
      couponCode: typeof couponCode === 'string' ? couponCode : undefined,
      billingDetails
    });

    return apiSuccess(result, 201);
  } catch (error) {
    return apiError(error);
  }
}
