'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ICustomerListItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  globalRoles: string[];
  status: string;
  activeEnrollmentCount: number;
  purchasesCount: number;
  createdAt: string;
}

interface IPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export default function StaffCustomersPage() {
  const [items, setItems] = useState<ICustomerListItem[]>([]);
  const [pagination, setPagination] = useState<IPagination>({ page: 1, limit: 15, totalItems: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = (targetPage = 1) => {
    setLoading(true);
    const query = new URLSearchParams();
    query.set('page', targetPage.toString());
    query.set('limit', '15');
    if (search.trim()) query.set('search', search.trim());
    if (status) query.set('status', status);

    fetch(`/api/v1/staff/customers?${query.toString()}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setItems(res.data.items);
          setPagination(res.data.pagination);
        } else {
          setError(res.error?.message || 'Failed to load customers');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers(1);
  }, [status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customer & Student Directory</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Operational customer registry displaying active enrollments, purchases, and account status.
        </p>
      </div>

      {/* Filter Controls */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by student name or email..."
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
          <option value="">All Account Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
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
          <p className="text-slate-500 dark:text-slate-400">No matching customers found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Roles</th>
                  <th className="p-4">Active Enrollments</th>
                  <th className="p-4">Orders / Purchases</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Registered</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900 dark:text-white">{c.fullName}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {c.globalRoles.map((r) => (
                          <span key={r} className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-blue-600 dark:text-blue-400">
                      📚 {c.activeEnrollmentCount}
                    </td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      💳 {c.purchasesCount}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${c.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/staff/customers/${c.id}`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Customer 360 →
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
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total customers)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchCustomers(pagination.page - 1)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchCustomers(pagination.page + 1)}
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
