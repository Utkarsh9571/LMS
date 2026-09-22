'use client';

import React, { useEffect, useState } from 'react';

interface IExecutiveKPIs {
  activeStudents: number;
  revenueByMarket?: Array<{
    marketCode: string;
    currency: string;
    totalMinorUnits: number;
  }>;
  activeServices?: number;
  upcomingWorkshops: number;
  completedWorkshops: number;
  certificatesIssued: number;
}

interface ILearningAnalytics {
  activeEnrollments: number;
  completedEnrollments: number;
  averageProgress: number;
  courseCompletionCount: number;
  lessonCompletionCount: number;
  quizPassRate: number;
  assignmentPassRate: number;
  certificatesIssued: number;
}

interface ISalesAnalytics {
  paidOrderCount: number;
  pendingPaymentCount: number;
  failedPaymentCount: number;
  revenueByMarket: Array<{
    marketCode: string;
    currency: string;
    totalMinorUnits: number;
  }>;
  revenueOverTime: Array<{
    period: string;
    marketCode: string;
    currency: string;
    totalMinorUnits: number;
  }>;
  revenueByProduct: Array<{
    productId: string;
    productTitle: string;
    totalMinorUnits: number;
  }>;
}

interface IWorkshopAnalytics {
  upcomingSessions: number;
  completedSessions: number;
  registeredStudents: number;
  attendedStudents: number;
  attendanceRatio: number;
}

interface IAnalyticsData {
  role: string;
  isGlobalAdmin: boolean;
  executiveKPIs: IExecutiveKPIs;
  learningAnalytics: ILearningAnalytics;
  salesAnalytics: ISalesAnalytics | null;
  workshopAnalytics: IWorkshopAnalytics;
}

export default function StaffAnalyticsPage() {
  const [data, setData] = useState<IAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/staff/analytics')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error?.message || 'Failed to load analytics dashboard.');
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
      <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 rounded-lg">
        <p className="font-semibold">Analytics Error</p>
        <p className="text-sm">{error || 'Failed to display analytics'}</p>
      </div>
    );
  }

  const { isGlobalAdmin, executiveKPIs, learningAnalytics, salesAnalytics, workshopAnalytics } = data;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff Operational & Performance Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isGlobalAdmin
            ? 'Executive overview of academy enrollment, learning completion rates, commercial revenue, and live workshop performance.'
            : 'Instructor-scoped performance metrics for assigned student cohorts, learning completions, and workshop attendance.'}
        </p>
      </div>

      {/* Executive KPIs Section */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Executive Key Performance Indicators
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block font-medium">Active Students</span>
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
              👥 {executiveKPIs.activeStudents.toLocaleString()}
            </span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block font-medium">Upcoming Workshops</span>
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
              🗓️ {executiveKPIs.upcomingWorkshops.toLocaleString()}
            </span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block font-medium">Completed Workshops</span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
              ✅ {executiveKPIs.completedWorkshops.toLocaleString()}
            </span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block font-medium">Certificates Issued</span>
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
              🎓 {executiveKPIs.certificatesIssued.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Global Admin Revenue KPIs */}
        {isGlobalAdmin && executiveKPIs.revenueByMarket && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {executiveKPIs.revenueByMarket.map((m) => (
              <div key={m.marketCode} className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
                  Total Revenue ({m.marketCode} Market)
                </span>
                <span className="text-xl font-bold text-emerald-900 dark:text-emerald-200 mt-1 block">
                  {(m.totalMinorUnits / 100).toLocaleString('en-US', { style: 'currency', currency: m.currency })}
                </span>
              </div>
            ))}
            {executiveKPIs.activeServices !== undefined && (
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-xs text-slate-500 block font-medium">Active Services & Programs</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                  🛍️ {executiveKPIs.activeServices.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Learning Analytics & Workshop Performance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Progress & Pass Rates Card */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            Learning Progress & Assessment Analytics
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Active Enrollments</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{learningAnalytics.activeEnrollments.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Course Completions</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{learningAnalytics.completedEnrollments.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Average Student Progress</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{learningAnalytics.averageProgress}%</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Completed Lessons</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{learningAnalytics.lessonCompletionCount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Quiz Pass Rate</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{learningAnalytics.quizPassRate}%</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Assignment Pass Rate</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{learningAnalytics.assignmentPassRate}%</span>
            </div>
          </div>
        </div>

        {/* Workshop & Attendance Roster Analytics Card */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            Workshop & Live Classroom Analytics
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Scheduled Sessions</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{workshopAnalytics.upcomingSessions.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Completed Sessions</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{workshopAnalytics.completedSessions.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Registered Cohort Students</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{workshopAnalytics.registeredStudents.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Actual Attended Students</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{workshopAnalytics.attendedStudents.toLocaleString()}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 block">Overall Attendance Ratio</span>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, workshopAnalytics.attendanceRatio))}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{workshopAnalytics.attendanceRatio}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales & Orders Analytics (Global Admin Only) */}
      {isGlobalAdmin && salesAnalytics && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            Commercial Orders & Revenue Distribution
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
              <span className="text-xs text-emerald-700 dark:text-emerald-300 block font-semibold">Paid Orders</span>
              <span className="text-xl font-bold text-emerald-800 dark:text-emerald-200">{salesAnalytics.paidOrderCount.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
              <span className="text-xs text-amber-700 dark:text-amber-300 block font-semibold">Pending Payment Orders</span>
              <span className="text-xl font-bold text-amber-800 dark:text-amber-200">{salesAnalytics.pendingPaymentCount.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-lg">
              <span className="text-xs text-red-700 dark:text-red-300 block font-semibold">Failed / Fulfillment Error Orders</span>
              <span className="text-xl font-bold text-red-800 dark:text-red-200">{salesAnalytics.failedPaymentCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Revenue by Product / Service */}
          {salesAnalytics.revenueByProduct.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Revenue by Service & Product</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
                    <tr>
                      <th className="p-3">Product / Program</th>
                      <th className="p-3 text-right">Total Paid Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {salesAnalytics.revenueByProduct.map((p) => (
                      <tr key={p.productId}>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{p.productTitle}</td>
                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {(p.totalMinorUnits / 100).toLocaleString('en-US', { style: 'currency', currency: 'SGD' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
