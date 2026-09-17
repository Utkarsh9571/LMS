import { NextResponse } from 'next/server';
import { isDatabaseConnected, connectToDatabase } from '@/lib/db';
import { config } from '@/lib/config';
import { apiSuccess } from '@/lib/api-response';

export async function GET(): Promise<NextResponse> {
  let dbStatus = 'disconnected';

  try {
    if (isDatabaseConnected()) {
      dbStatus = 'connected';
    } else {
      // Attempt connection check with short timeout
      await connectToDatabase();
      dbStatus = isDatabaseConnected() ? 'connected' : 'connecting';
    }
  } catch {
    dbStatus = 'unavailable';
  }

  return apiSuccess({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
    database: {
      status: dbStatus
    },
    markets: ['SG', 'MY'],
    providers: {
      mockPayment: config.providers.useMockPayment,
      mockMeeting: config.providers.useMockMeeting
    }
  });
}
