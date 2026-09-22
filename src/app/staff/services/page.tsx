'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface IServiceSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  deliverableType: 'course' | 'batch';
  targetId: string;
  targetTitle: string;
  marketCode: 'SG' | 'MY';
  currency: string;
  basePriceMinorUnits: number;
  displayOriginalPriceMinorUnits: number | null;
  offerId: string;
  isActive: boolean;
  activeUserCount: number;
  createdAt: string;
}

interface ICourseOption {
  id: string;
  title: string;
}

interface IBatchOption {
  id: string;
  name: string;
  code: string;
}

export default function StaffServicesPage() {
  const searchParams = useSearchParams();
  const [services, setServices] = useState<IServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Service Wizard State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [courses, setCourses] = useState<ICourseOption[]>([]);
  const [batches, setBatches] = useState<IBatchOption[]>([]);
  const [createLoading, setCreateLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    deliverableType: 'course' as 'course' | 'batch',
    targetId: '',
    priceMajor: 99,
    displayOriginalPriceMajor: 149
  });

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  const fetchServices = () => {
    setLoading(true);
    fetch('/api/v1/services')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setServices(res.data);
        } else {
          setError(res.error?.message || 'Failed to load services.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch deliverable targets when modal opens
  useEffect(() => {
    if (isCreateOpen) {
      if (form.deliverableType === 'course' && courses.length === 0) {
        fetch('/api/v1/courses')
          .then((res) => res.json())
          .then((res) => {
            if (res.success) {
              setCourses(res.data.map((c: any) => ({ id: c.id, title: c.title })));
              if (res.data.length > 0) setForm((prev) => ({ ...prev, targetId: res.data[0].id }));
            }
          });
      } else if (form.deliverableType === 'batch' && batches.length === 0) {
        fetch('/api/v1/batches')
          .then((res) => res.json())
          .then((res) => {
            if (res.success) {
              setBatches(res.data.map((b: any) => ({ id: b.id, name: b.name, code: b.code })));
              if (res.data.length > 0) setForm((prev) => ({ ...prev, targetId: res.data[0].id }));
            }
          });
      }
    }
  }, [isCreateOpen, form.deliverableType]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.targetId) {
      alert('Please fill in all required fields.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch('/api/v1/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          deliverableType: form.deliverableType,
          targetId: form.targetId,
          priceMinorUnits: Math.round(form.priceMajor * 100),
          displayOriginalPriceMinorUnits: form.displayOriginalPriceMajor ? Math.round(form.displayOriginalPriceMajor * 100) : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setForm({
          title: '',
          description: '',
          deliverableType: 'course',
          targetId: '',
          priceMajor: 99,
          displayOriginalPriceMajor: 149
        });
        fetchServices();
      } else {
        alert(`Error: ${data.error?.message || 'Failed to create service'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Services & Programs Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Commercial service catalog displaying active users, start dates, pricing, and program status.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <span>🛍️</span> Create Service / Program
        </button>
      </div>

      {/* Services Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      ) : services.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-slate-500 dark:text-slate-400">No commercial services found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Service / Program</th>
                <th className="p-4">Deliverable Content</th>
                <th className="p-4">Price</th>
                <th className="p-4">Active Users</th>
                <th className="p-4">Market</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {services.map((s) => (
                <tr key={`${s.id}_${s.offerId}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-900 dark:text-white">{s.title}</p>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{s.description}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {s.deliverableType.toUpperCase()}: {s.targetTitle}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    {(s.basePriceMinorUnits / 100).toLocaleString('en-US', {
                      style: 'currency',
                      currency: s.currency
                    })}
                  </td>
                  <td className="p-4 font-bold text-blue-600 dark:text-blue-400">
                    👥 {s.activeUserCount}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {s.marketCode}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded ${
                        s.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {s.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <a
                      href={`/dashboard/courses`}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Content →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Service Wizard Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Service / Program</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Program Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Complete Fullstack Engineering Masterclass"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Commercial summary of this program offering"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deliverable Type *
                  </label>
                  <select
                    value={form.deliverableType}
                    onChange={(e) => setForm({ ...form, deliverableType: e.target.value as any, targetId: '' })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="course">Course (Self-paced)</option>
                    <option value="batch">Batch (Cohort/Live)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Content *
                  </label>
                  {form.deliverableType === 'course' ? (
                    <select
                      value={form.targetId}
                      onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={form.targetId}
                      onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.priceMajor}
                    onChange={(e) => setForm({ ...form, priceMajor: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Original Strike-through Price
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.displayOriginalPriceMajor}
                    onChange={(e) => setForm({ ...form, displayOriginalPriceMajor: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !form.targetId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {createLoading ? 'Publishing...' : 'Publish Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
