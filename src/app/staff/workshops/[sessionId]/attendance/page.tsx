'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface IAttendanceRosterItem {
  userId: string;
  fullName: string;
  email: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  joinedAt: string | null;
  lastSeenAt: string | null;
  joinCount: number;
}

interface IAttendanceWorkspace {
  session: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    batchId: string;
    courseId: string;
  };
  batch: {
    id: string;
    name: string;
    primaryInstructorId: string;
  };
  summary: {
    totalEnrolled: number;
    totalAttended: number;
    attendancePercentage: number;
  };
  roster: IAttendanceRosterItem[];
}

export default function WorkshopAttendancePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [data, setData] = useState<IAttendanceWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchWorkspace = () => {
    setLoading(true);
    fetch(`/api/v1/staff/workshops/${sessionId}/attendance`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error?.message || 'Failed to load attendance roster.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkspace();
  }, [sessionId]);

  const handleStatusOverride = (targetUserId: string, newStatus: string) => {
    setUpdatingUser(targetUserId);
    fetch(`/api/v1/staff/workshops/${sessionId}/attendance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, status: newStatus }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          fetchWorkspace();
        } else {
          alert(res.error?.message || 'Failed to update attendance status.');
        }
      })
      .catch((err) => alert(err.message))
      .finally(() => setUpdatingUser(null));
  };

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
        <p className="font-semibold">Attendance Workspace Error</p>
        <p className="text-sm">{error || 'Session attendance workspace unavailable.'}</p>
      </div>
    );
  }

  const { session, batch, summary, roster } = data;

  return (
    <div className="space-y-8">
      {/* Back Link & Header */}
      <div>
        <Link href="/staff/workshops" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Workshops
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{session.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cohort Batch: <span className="font-semibold text-slate-900 dark:text-white">{batch.name}</span> •{' '}
              {new Date(session.startTime).toLocaleString()}
            </p>
          </div>
          <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full self-start sm:self-auto ${session.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
            Session: {session.status}
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 block font-medium">Total Enrolled Cohort Students</span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            👥 {summary.totalEnrolled}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 block font-medium">Attended Students (Present + Late)</span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            ✅ {summary.totalAttended}
          </span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 block font-medium">Session Attendance Percentage</span>
          <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
            📊 {summary.attendancePercentage}%
          </span>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Student Attendance Roster ({roster.length})
          </h2>
        </div>

        {roster.length === 0 ? (
          <p className="text-xs text-slate-500">No active students enrolled in this cohort batch.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">First Joined</th>
                  <th className="p-3">Last Seen</th>
                  <th className="p-3">Joins</th>
                  <th className="p-3 text-right">Manual Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {roster.map((r) => (
                  <tr key={r.userId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-slate-900 dark:text-white">{r.fullName}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${
                          r.status === 'present'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : r.status === 'late'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : r.status === 'excused'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {r.joinedAt ? new Date(r.joinedAt).toLocaleTimeString() : '—'}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {r.lastSeenAt ? new Date(r.lastSeenAt).toLocaleTimeString() : '—'}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {r.joinCount}
                    </td>
                    <td className="p-3 text-right">
                      <select
                        disabled={updatingUser === r.userId}
                        value={r.status}
                        onChange={(e) => handleStatusOverride(r.userId, e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="excused">Excused</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
