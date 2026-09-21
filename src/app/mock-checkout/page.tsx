'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/format-currency';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function MockCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get('sessionId') || '';
  const orderNumber = searchParams.get('orderNumber') || '';
  const attemptId = searchParams.get('attemptId') || '';
  const amountStr = searchParams.get('amount') || '0';
  const currency = searchParams.get('currency') || 'SGD';

  const amountMinorUnits = parseInt(amountStr, 10) || 0;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulatePayment = async (status: 'succeeded' | 'failed') => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/webhooks/payments/mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: `mock_evt_${Date.now()}`,
          externalReference: `mock_ref_${attemptId}`,
          status,
          amountMinorUnits,
          currency,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Simulation request failed.');
      }

      router.push('/dashboard/orders');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Simulation failed';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 shadow-lg">
        <CardHeader className="bg-blue-600 text-white rounded-t-xl py-6">
          <CardTitle className="text-xl text-center">
            💳 Development Mock Payment Gateway
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg p-4 text-center space-y-1">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Order Number</p>
            <p className="font-mono font-bold text-slate-900 dark:text-white text-base">{orderNumber}</p>
            <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 pt-2">
              {formatCurrency(amountMinorUnits, currency)}
            </p>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 font-mono bg-slate-100 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800">
            <p>Session ID: {sessionId}</p>
            <p>Attempt ID: {attemptId}</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 rounded text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={() => simulatePayment('succeeded')}
              disabled={loading}
              className="w-full py-3 px-4 rounded-md font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Simulate Successful Payment'}
            </button>
            <button
              onClick={() => simulatePayment('failed')}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-md font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors disabled:opacity-50 text-sm"
            >
              Simulate Failed Payment
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading mock payment gateway...</div>}>
      <MockCheckoutContent />
    </Suspense>
  );
}
