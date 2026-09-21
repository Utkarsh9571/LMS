'use client';

import React, { useState } from 'react';
import { apiPost } from '@/lib/api/client';

interface RetryPaymentButtonProps {
  orderNumber: string;
}

export function RetryPaymentButton({ orderNumber }: RetryPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiPost<{
        orderNumber: string;
        paymentAttemptId: string;
        checkoutUrl?: string;
      }>(`/api/v1/orders/${orderNumber}/retry-payment`, {});

      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Retry payment failed.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <button
        onClick={handleRetry}
        disabled={loading}
        className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Retrying...' : 'Retry Payment'}
      </button>
    </div>
  );
}
