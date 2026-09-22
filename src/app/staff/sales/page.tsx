'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ISalesListItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  productTitle: string;
  marketCode: string;
  currency: string;
  totalMinorUnits: number;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
}

interface IPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export default function StaffSalesPage() {
  const [items, setItems] = useState<ISalesListItem[]>([]);
  const [pagination, setPagination] = useState<IPagination>({ page: 1, limit: 15, totalItems: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [marketCode, setMarketCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = (targetPage = 1) => {
    setLoading(true);
    const query = new URLSearchParams();
    query.set('page', targetPage.toString());
    query.set('limit', '15');
    if (search.trim()) query.set('search', search.trim());
    if (status) query.set('status', status);
    if (marketCode) query.set('marketCode', marketCode);

    fetch(`/api/v1/staff/sales?${query.toString()}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setItems(res.data.items);
          setPagination(res.data.pagination);
        } else {
          setError(res.error?.message || 'Failed to load sales ledger');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSales(1);
  }, [status, marketCode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSales(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales & Orders Ledger</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Operational transaction log showing orders, payment attempts, market currencies, and fulfillment status.
        </p>
      </div>

      {/* Filter Controls */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by order number, customer name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Order Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="payment_failed">Payment Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={marketCode}
          onChange={(e) => setMarketCode(e.target.value)}
          className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Markets</option>
          <option value="SG">Singapore (SG - SGD)</option>
          <option value="MY">Malaysia (MY - MYR)</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          Search
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-slate-500 dark:text-slate-400">No matching sales orders found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Order Number</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Purchased Product</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Market</th>
                  <th className="p-4">Order Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {s.orderNumber}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 dark:text-white">{s.customerName}</p>
                      <p className="text-xs text-slate-500">{s.customerEmail}</p>
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {s.productTitle}
                    </td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {(s.totalMinorUnits / 100).toLocaleString('en-US', { style: 'currency', currency: s.currency })}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {s.marketCode}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${
                          s.orderStatus === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : s.orderStatus === 'pending_payment'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {s.orderStatus}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/staff/sales/${s.orderNumber}`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Order Trace →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total orders)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchSales(pagination.page - 1)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchSales(pagination.page + 1)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
