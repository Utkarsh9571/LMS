import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/core/services/webhook.service';
import { logger } from '@/lib/logger';
import { AuthenticationError, PaymentProviderError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // 1. Read Raw Body as text BEFORE any JSON parsing (crucial for HMAC calculation)
    const rawBody = await request.text();

    // 2. Extract headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    logger.info('[HitPay Webhook Route] Incoming webhook request received', {
      contentLength: rawBody.length,
      hasSignature: Boolean(headers['hitpay-signature'] || headers['x-hitpay-signature'])
    });

    // 3. Process Webhook through service
    const result = await WebhookService.processWebhook('hitpay', rawBody, headers);

    return NextResponse.json(
      {
        success: true,
        status: result.status,
        eventId: result.eventId,
        orderNumber: result.orderNumber,
        message: result.message
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('[HitPay Webhook Route] Webhook processing failed', {
      error: error.message,
      name: error.name
    });

    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof PaymentProviderError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error during webhook processing.' },
      { status: 500 }
    );
  }
}
