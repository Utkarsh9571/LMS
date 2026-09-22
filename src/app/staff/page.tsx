'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface IDashboardData {
  metrics: {
    activeStudentsCount: number;
    totalRevenueMinorUnits: number;
    currency: string;
    activeServicesCount: number;
    isGlobalAdmin: boolean;
  };
  upcomingSessions: Array<{
    id: string;
    title: string;
    startTime: string;
    durationMinutes: number;
    status: string;
    batchId: string;
    hostUrl?: string;
    studentJoinUrl: string;
  }>;
}

export default function StaffDashboardPage() {
  const [data, setData] = useState<IDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/staff/dashboard')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error?.message || 'Failed to load dashboard data');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300">
        <p className="font-semibold">Error loading staff dashboard</p>
        <p className="text-sm">{error || 'Unknown error'}</p>
      </div>
    );
  }

  const { metrics, upcomingSessions } = data;
  const formattedRevenue = (metrics.totalRevenueMinorUnits / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: metrics.currency || 'USD'
  });

  return (
    <div className="space-y-8">
      {/* Header & Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Operational Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Real-time summary of operational metrics, upcoming workshops, and quick staff actions.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Students
          </p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {metrics.activeStudentsCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Currently enrolled across active batches</p>
        </div>

        {metrics.isGlobalAdmin && (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Revenue
            </p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
              {formattedRevenue}
            </p>
            <p className="text-xs text-slate-500 mt-1">Completed market order revenue</p>
          </div>
        )}

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Upcoming Workshops
          </p>
          <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
            {upcomingSessions.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Scheduled sessions ready to host</p>
        </div>

        {metrics.isGlobalAdmin && (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Services
            </p>
            <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
              {metrics.activeServicesCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">Listed programs & commercial offers</p>
          </div>
        )}
      </div>

      {/* Quick Actions Panel */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Operational Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/staff/workshops?action=schedule"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            🗓️ Schedule Workshop
          </Link>

          {metrics.isGlobalAdmin && (
            <Link
              href="/staff/services?action=create"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              🛍️ Create Service / Program
            </Link>
          )}

          <Link
            href="/dashboard/courses"
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-sm font-semibold transition-colors"
          >
            📚 Manage Content Engine
          </Link>
        </div>
      </div>

      {/* Upcoming Workshops List */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Next Upcoming Workshops</h2>
          <Link
            href="/staff/workshops"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All Workshops →
          </Link>
        </div>

        {upcomingSessions.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">No upcoming workshops scheduled.</p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">
                    {session.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    📅 {new Date(session.startTime).toLocaleString()} ({session.durationMinutes} mins)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {session.hostUrl ? (
                    <a
                      href={session.hostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors"
                    >
                      🚀 Join as Host
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Host link unavailable</span>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(session.studentJoinUrl)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-md transition-colors"
                  >
                    📋 Copy Student Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
