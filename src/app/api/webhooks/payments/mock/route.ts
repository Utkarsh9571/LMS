import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/core/services/webhook.service';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { AuthenticationError, PaymentProviderError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  // Security invariant: Mock webhook is disabled in production
  if (config.isProduction) {
    logger.warn('[Mock Webhook Route] Attempt to call mock payment webhook in production rejected');
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const rawBody = await request.text();

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    logger.info('[Mock Webhook Route] Mock webhook received in dev/test environment');

    // Exercise real fulfillment service with mock provider
    const result = await WebhookService.processWebhook('mock', rawBody, headers);

    return NextResponse.json(
      {
        success: true,
        status: result.status,
        eventId: result.eventId,
        orderNumber: result.orderNumber,
        fulfillment: result.fulfillment,
        message: result.message
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('[Mock Webhook Route] Mock webhook simulation error', {
      error: error.message
    });

    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof PaymentProviderError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Error processing mock payment.' },
      { status: 500 }
    );
  }
}
