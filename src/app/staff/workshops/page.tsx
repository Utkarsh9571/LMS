'use client';

import React, { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';

interface IWorkshop {
  id: string;
  batchId: string;
  courseId: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  meetingProvider: string;
  providerMeetingId: string;
  hostUrl?: string;
  studentJoinUrl: string;
  recordingStatus: string;
  recordingUrl?: string | null;
  programTitle: string;
  batchName: string;
  batchCode: string;
  batchCapacity: number;
  enrolledCount: number;
  attendeeCount: number;
}

interface IBatchOption {
  id: string;
  name: string;
  code: string;
  courseId: string;
}

export default function StaffWorkshopsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [workshops, setWorkshops] = useState<IWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scheduling Modal State
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [batches, setBatches] = useState<IBatchOption[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    batchId: '',
    title: '',
    description: '',
    startTime: '',
    durationMinutes: 60
  });

  useEffect(() => {
    if (searchParams.get('action') === 'schedule') {
      setIsScheduleOpen(true);
    }
  }, [searchParams]);

  const fetchWorkshops = () => {
    setLoading(true);
    fetch(`/api/v1/staff/workshops?status=${tab}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setWorkshops(res.data);
        } else {
          setError(res.error?.message || 'Failed to load workshops.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkshops();
  }, [tab]);

  // Fetch available batches when scheduling modal opens
  useEffect(() => {
    if (isScheduleOpen && batches.length === 0) {
      fetch('/api/v1/batches')
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            setBatches(res.data.map((b: any) => ({ id: b.id, name: b.name, code: b.code, courseId: b.courseId })));
            if (res.data.length > 0) {
              setScheduleForm((prev) => ({ ...prev, batchId: res.data[0].id }));
            }
          }
        });
    }
  }, [isScheduleOpen]);

  const handleCopyLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.batchId || !scheduleForm.title || !scheduleForm.startTime) {
      alert('Please fill in all required fields.');
      return;
    }

    setScheduleLoading(true);
    try {
      const res = await fetch(`/api/v1/batches/${scheduleForm.batchId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: scheduleForm.title,
          description: scheduleForm.description,
          startTime: new Date(scheduleForm.startTime).toISOString(),
          durationMinutes: Number(scheduleForm.durationMinutes)
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsScheduleOpen(false);
        setScheduleForm({ batchId: '', title: '', description: '', startTime: '', durationMinutes: 60 });
        fetchWorkshops();
      } else {
        alert(`Error: ${data.error?.message || 'Failed to schedule workshop'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setScheduleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Workshops & Live Occurrences
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Operational workspace for scheduled occurrences, host launching, student links, and attendance.
          </p>
        </div>
        <button
          onClick={() => setIsScheduleOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <span>🗓️</span> Schedule Workshop
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-sm font-semibold">
        <button
          onClick={() => setTab('upcoming')}
          className={`pb-3 border-b-2 transition-colors ${
            tab === 'upcoming'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Upcoming & Scheduled
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`pb-3 border-b-2 transition-colors ${
            tab === 'completed'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Completed Workstation History
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      ) : workshops.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-slate-500 dark:text-slate-400">
            No {tab} workshops found for your assigned batches.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {workshops.map((w) => (
            <div
              key={w.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full ${
                      w.status === 'live'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 animate-pulse'
                        : w.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {w.status}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    Program: {w.programTitle}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    Batch: {w.batchName} ({w.batchCode})
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{w.title}</h3>
                {w.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">{w.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                  <span>📅 {new Date(w.startTime).toLocaleString()}</span>
                  <span>⏱️ {w.durationMinutes} minutes</span>
                  <span>👥 Enrolled: {w.enrolledCount}/{w.batchCapacity}</span>
                  <span>✅ Attendees Logged: {w.attendeeCount}</span>
                  <span>📹 Provider: {w.meetingProvider.toUpperCase()}</span>
                </div>
              </div>

              {/* Staff Quick Action Controls */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                {w.hostUrl ? (
                  <a
                    href={w.hostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg text-center shadow-sm transition-colors"
                  >
                    🚀 Join as Host
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic text-center">Host link restricted</span>
                )}

                <button
                  onClick={() => handleCopyLink(w.id, w.studentJoinUrl)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>📋</span>
                  <span>{copiedId === w.id ? 'Copied Student Link!' : 'Copy Student Link'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Workshop Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Workshop</h3>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Target Batch *
                </label>
                {batches.length === 0 ? (
                  <p className="text-xs text-amber-600">No active batches available. Create a batch first.</p>
                ) : (
                  <select
                    value={scheduleForm.batchId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, batchId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workshop Title *
                </label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  placeholder="e.g. Masterclass 1: System Design Architecture"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                  rows={2}
                  placeholder="Operational notes or session agenda"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    min={15}
                    value={scheduleForm.durationMinutes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleLoading || batches.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {scheduleLoading ? 'Scheduling...' : 'Save & Schedule Workshop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
