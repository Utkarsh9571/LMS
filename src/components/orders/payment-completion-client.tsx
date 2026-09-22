'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format-currency';

type Order = {
  orderNumber: string;
  status: 'pending_payment' | 'paid' | 'payment_failed' | 'fulfillment_failed' | 'refunded' | 'cancelled';
  totalMinorUnits: number;
  currency: string;
  marketCode: string;
  fulfillmentError?: string | null;
};

export function PaymentCompletionClient({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const next = await apiGet<Order>(`/api/v1/orders/${encodeURIComponent(orderNumber)}`);
        if (cancelled) return;
        setOrder(next);
        if (next.status === 'pending_payment') {
          timer = setTimeout(poll, 3000);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load payment status.');
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderNumber]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-5">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payment status unavailable</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
        <Link href="/dashboard/orders" className="inline-flex px-4 py-2 rounded-md bg-blue-600 text-white font-semibold">View orders</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-4">
        <div className="mx-auto h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Checking your payment…</h1>
        <p className="text-sm text-slate-500">We are confirming order {orderNumber}.</p>
      </div>
    );
  }

  const copy = {
    paid: {
      title: 'Payment confirmed',
      message: 'Your enrollment has been processed. You can start learning from your student dashboard.',
      action: 'Go to my courses'
    },
    pending_payment: {
      title: 'Payment processing',
      message: 'Your payment provider has not confirmed the transaction yet. This page will update automatically.',
      action: 'View orders'
    },
    payment_failed: {
      title: 'Payment not completed',
      message: 'The payment attempt was not completed. You can retry it from your orders.',
      action: 'Retry from orders'
    },
    fulfillment_failed: {
      title: 'Payment received — enrollment processing',
      message: order.fulfillmentError || 'Payment was received, but enrollment still needs operational processing.',
      action: 'View orders'
    },
    refunded: {
      title: 'Order refunded',
      message: 'This order has been refunded.',
      action: 'View orders'
    },
    cancelled: {
      title: 'Order cancelled',
      message: 'This order is cancelled and no enrollment will be granted from it.',
      action: 'View orders'
    }
  }[order.status];

  const destination = order.status === 'paid' ? '/dashboard/courses' : '/dashboard/orders';

  return (
    <div className="max-w-xl mx-auto text-center space-y-6">
      <div className="inline-flex px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {order.status.replace('_', ' ')}
      </div>
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{copy.message}</p>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-left space-y-3">
        <div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Order</span><span className="font-mono font-semibold text-sm">{order.orderNumber}</span></div>
        <div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Market</span><span className="font-semibold text-sm">{order.marketCode}</span></div>
        <div className="flex justify-between gap-4"><span className="text-sm text-slate-500">Amount</span><span className="font-bold">{formatCurrency(order.totalMinorUnits, order.currency)}</span></div>
      </div>
      <Link href={destination} className="inline-flex px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">
        {copy.action}
      </Link>
    </div>
  );
}
