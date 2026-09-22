'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface ISalesDetail {
  order: {
    id: string;
    orderNumber: string;
    userId: string;
    marketCode: string;
    productId: string;
    productTitle: string;
    customerName: string;
    customerEmail: string;
    currency: string;
    subtotalMinorUnits: number;
    discountMinorUnits: number;
    taxMinorUnits: number;
    totalMinorUnits: number;
    billingDetails: {
      fullName: string;
      email: string;
      phone: string;
      country: string;
      addressLine1?: string;
    };
    status: string;
    fulfillmentError?: string | null;
    createdAt: string;
  };
  paymentAttempts: Array<{
    id: string;
    attemptNumber: number;
    provider: string;
    externalReference?: string | null;
    currency: string;
    amountMinorUnits: number;
    status: string;
    errorMessage?: string | null;
    paidAt?: string | null;
    createdAt: string;
  }>;
  entitlements: Array<{
    id: string;
    targetType: string;
    targetId: string;
    status: string;
    grantedAt: string;
  }>;
  enrollments: Array<{
    id: string;
    courseId: string;
    status: string;
    progressPercent: number;
    enrolledAt: string;
  }>;
}

export default function StaffSalesDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [data, setData] = useState<ISalesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/staff/sales/${orderId}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error?.message || 'Failed to load order details');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 rounded-lg">
        <p className="font-semibold">Order Trace Error</p>
        <p className="text-sm">{error || 'Order record not found'}</p>
      </div>
    );
  }

  const { order, paymentAttempts, entitlements, enrollments } = data;

  return (
    <div className="space-y-8">
      {/* Header & Back Link */}
      <div>
        <Link href="/staff/sales" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Sales Ledger
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{order.orderNumber}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Purchased Product: <span className="font-semibold text-slate-900 dark:text-white">{order.productTitle}</span>
            </p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-bold uppercase rounded-full self-start sm:self-auto ${
              order.status === 'paid'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            Order: {order.status}
          </span>
        </div>
      </div>

      {/* Trace Chain Diagram */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Operational Lifecycle Trace
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded">Customer: {order.customerName}</span>
          <span>➔</span>
          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded">Order: {order.orderNumber}</span>
          <span>➔</span>
          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded">Attempts: {paymentAttempts.length}</span>
          <span>➔</span>
          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded">Entitlements: {entitlements.length}</span>
        </div>
      </div>

      {/* Grid Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Billing & Order Breakdown */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            Order & Commercial Breakdown
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Market & Currency</span>
              <span className="font-semibold">{order.marketCode} ({order.currency})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Subtotal</span>
              <span>{(order.subtotalMinorUnits / 100).toLocaleString('en-US', { style: 'currency', currency: order.currency })}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Discount</span>
              <span>-{(order.discountMinorUnits / 100).toLocaleString('en-US', { style: 'currency', currency: order.currency })}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
              <span>Total Paid</span>
              <span className="text-emerald-600 dark:text-emerald-400">{(order.totalMinorUnits / 100).toLocaleString('en-US', { style: 'currency', currency: order.currency })}</span>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Billing Details</h3>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">{order.billingDetails.fullName}</p>
            <p className="text-xs text-slate-500">{order.billingDetails.email} • {order.billingDetails.phone}</p>
            <p className="text-xs text-slate-500">{order.billingDetails.country}</p>
          </div>
        </div>

        {/* Payment Attempts History */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            Payment Attempt History ({paymentAttempts.length})
          </h2>

          {paymentAttempts.length === 0 ? (
            <p className="text-xs text-slate-500">No payment attempts logged.</p>
          ) : (
            <div className="space-y-3">
              {paymentAttempts.map((attempt) => (
                <div key={attempt.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-white">Attempt #{attempt.attemptNumber} ({attempt.provider.toUpperCase()})</span>
                    <span className={`px-2 py-0.5 font-bold uppercase rounded ${attempt.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700'}`}>{attempt.status}</span>
                  </div>
                  <p className="text-slate-500">Amount: {(attempt.amountMinorUnits / 100).toLocaleString('en-US', { style: 'currency', currency: attempt.currency })}</p>
                  {attempt.externalReference && <p className="font-mono text-[11px] text-slate-500 truncate">Ref: {attempt.externalReference}</p>}
                  {attempt.errorMessage && <p className="text-red-600 dark:text-red-400 font-medium">Error: {attempt.errorMessage}</p>}
                  {attempt.paidAt && <p className="text-emerald-600 dark:text-emerald-400 font-medium">Paid at: {new Date(attempt.paidAt).toLocaleString()}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
