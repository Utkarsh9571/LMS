'use client';

import React, { useEffect, useState } from 'react';
import { IStaffMessageSafeDTO } from '@/core/domain/domain-types';

interface IBatchOption {
  id: string;
  name: string;
  batchCode: string;
  courseTitle: string;
  enrolledCount: number;
}

interface ISessionOption {
  id: string;
  title: string;
  batchName: string;
  startTime: string;
  status: string;
  enrolledCount: number;
}

interface IStudentOption {
  id: string;
  fullName: string;
  batchName: string;
}

interface IOptionsData {
  batches: IBatchOption[];
  sessions: ISessionOption[];
  students: IStudentOption[];
}

export default function StaffMessagesPage() {
  const [tab, setTab] = useState<'reminder' | 'announcement' | 'individual' | 'history'>('reminder');
  const [options, setOptions] = useState<IOptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Form states
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Confirmation modal & idempotency state
  const [confirmData, setConfirmData] = useState<{
    action: 'workshop_reminder' | 'batch_announcement' | 'individual_email';
    recipientCount: number;
    title: string;
    idempotencyKey: string;
  } | null>(null);

  // Message History state
  const [history, setHistory] = useState<IStaffMessageSafeDTO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchOptions = () => {
    setLoading(true);
    fetch('/api/v1/staff/messages/options')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setOptions(res.data);
          if (res.data.sessions.length > 0) setSelectedSessionId(res.data.sessions[0].id);
          if (res.data.batches.length > 0) setSelectedBatchId(res.data.batches[0].id);
          if (res.data.students.length > 0) setSelectedUserId(res.data.students[0].id);
        } else {
          setError(res.error?.message || 'Failed to load messaging options.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const fetchHistory = () => {
    setHistoryLoading(true);
    fetch('/api/v1/staff/messages?limit=50')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setHistory(res.data || []);
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    fetchOptions();
    fetchHistory();
  }, []);

  const selectedSession = options?.sessions.find((s) => s.id === selectedSessionId);
  const selectedBatch = options?.batches.find((b) => b.id === selectedBatchId);
  const selectedStudent = options?.students.find((st) => st.id === selectedUserId);

  const generateIdempotencyKey = (prefix: string) => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setConfirmData({
      action: 'workshop_reminder',
      recipientCount: selectedSession.enrolledCount,
      title: `Send workshop reminder to ${selectedSession.enrolledCount} active student(s) for "${selectedSession.title}"?`,
      idempotencyKey: generateIdempotencyKey('reminder')
    });
  };

  const handleAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    if (!subject.trim()) {
      alert('Please enter a subject.');
      return;
    }
    if (!message.trim()) {
      alert('Please enter a message.');
      return;
    }
    setConfirmData({
      action: 'batch_announcement',
      recipientCount: selectedBatch.enrolledCount,
      title: `Send announcement to ${selectedBatch.enrolledCount} active student(s) in "${selectedBatch.name}"?`,
      idempotencyKey: generateIdempotencyKey('announcement')
    });
  };

  const handleIndividualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!subject.trim()) {
      alert('Please enter a subject.');
      return;
    }
    if (!message.trim()) {
      alert('Please enter a message.');
      return;
    }
    setConfirmData({
      action: 'individual_email',
      recipientCount: 1,
      title: `Send direct operational email to student "${selectedStudent.fullName}" (${selectedStudent.batchName})?`,
      idempotencyKey: generateIdempotencyKey('direct')
    });
  };

  const executeSend = () => {
    if (!confirmData) return;
    setIsSending(true);
    setError(null);
    setSuccessMsg(null);

    const payload: Record<string, any> = {
      action: confirmData.action,
      idempotencyKey: confirmData.idempotencyKey
    };

    if (confirmData.action === 'workshop_reminder') {
      payload.sessionId = selectedSessionId;
    } else if (confirmData.action === 'batch_announcement') {
      payload.batchId = selectedBatchId;
      payload.subject = subject.trim();
      payload.message = message.trim();
    } else if (confirmData.action === 'individual_email') {
      payload.targetUserId = selectedUserId;
      payload.subject = subject.trim();
      payload.message = message.trim();
    }

    fetch('/api/v1/staff/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          const { sent, recipientCount, failedCount, status, duplicate, error: dispatchErr } = res.data;

          if (status === 'failed' || !sent) {
            setError(dispatchErr || 'Dispatch Failed: Email provider failed to send notifications.');
          } else if (status === 'partially_failed') {
            setSuccessMsg(
              `⚠️ Partial dispatch: ${recipientCount} succeeded, ${failedCount} failed at provider.${
                duplicate ? ' (Duplicate submission detected)' : ''
              }`
            );
          } else {
            setSuccessMsg(
              `✅ Message successfully submitted to provider for ${recipientCount} recipient(s).${
                duplicate ? ' (Idempotent response: already submitted)' : ''
              }`
            );
          }

          if (confirmData.action !== 'workshop_reminder') {
            setSubject('');
            setMessage('');
          }
          fetchHistory();
        } else {
          setError(res.error?.message || 'Failed to dispatch message.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        setIsSending(false);
        setConfirmData(null);
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff Operational Communications</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Dispatch operational class reminders, cohort announcements, and direct student communications with server-side recipient targeting.
        </p>
      </div>

      {/* Success & Error Banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-200 rounded-lg flex justify-between items-center text-sm font-semibold">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 rounded-lg text-sm">
          <p className="font-semibold">Dispatch Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Action Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-sm font-semibold">
        <button
          onClick={() => { setTab('reminder'); setSuccessMsg(null); setError(null); }}
          className={`pb-3 border-b-2 transition-colors ${
            tab === 'reminder'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          🗓️ Workshop Reminder
        </button>
        <button
          onClick={() => { setTab('announcement'); setSuccessMsg(null); setError(null); }}
          className={`pb-3 border-b-2 transition-colors ${
            tab === 'announcement'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          📢 Batch Announcement
        </button>
        <button
          onClick={() => { setTab('individual'); setSuccessMsg(null); setError(null); }}
          className={`pb-3 border-b-2 transition-colors ${
            tab === 'individual'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          ✉️ Individual Student Email
        </button>
        <button
          onClick={() => { setTab('history'); setSuccessMsg(null); setError(null); fetchHistory(); }}
          className={`pb-3 border-b-2 transition-colors ${
            tab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          📜 Message History ({history.length})
        </button>
      </div>

      {/* Action 1: Workshop Reminder */}
      {tab === 'reminder' && (
        <form onSubmit={handleReminderSubmit} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-5 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Dispatch Workshop Classroom Reminder</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sends automated email notifications with classroom join links and market-accurate timezone formatting to active enrolled students.
            </p>
          </div>

          {options?.sessions.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500">
              No upcoming scheduled workshops found for your authorized batches.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Workshop Live Classroom Session
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {options?.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.batchName}) • {new Date(s.startTime).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSession && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs space-y-1.5">
                  <p><strong className="text-slate-900 dark:text-white">Session Title:</strong> {selectedSession.title}</p>
                  <p><strong className="text-slate-900 dark:text-white">Cohort Batch:</strong> {selectedSession.batchName}</p>
                  <p><strong className="text-slate-900 dark:text-white">Scheduled Time:</strong> {new Date(selectedSession.startTime).toLocaleString()}</p>
                  <p><strong className="text-slate-900 dark:text-white">Server-Calculated Recipient Scope:</strong> <span className="font-bold text-blue-600 dark:text-blue-400">{selectedSession.enrolledCount} active entitled student(s)</span></p>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedSession || selectedSession.enrolledCount === 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
              >
                Dispatch Workshop Reminder
              </button>
            </div>
          )}
        </form>
      )}

      {/* Action 2: Batch Announcement */}
      {tab === 'announcement' && (
        <form onSubmit={handleAnnouncementSubmit} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-5 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Broadcast Cohort Batch Announcement</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sends an operational announcement email to all active students with valid entitlements in the selected batch.
            </p>
          </div>

          {options?.batches.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500">
              No authorized cohort batches found for message broadcast.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Cohort Batch
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {options?.batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.courseTitle}) • {b.enrolledCount} Active Entitled Students
                    </option>
                  ))}
                </select>
              </div>

              {selectedBatch && (
                <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded">
                  Server Recipient Calculation: <strong className="text-slate-900 dark:text-white">{selectedBatch.enrolledCount} active entitled student(s)</strong> will receive this email.
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Line (Max 200 chars)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Schedule Update for Revit Architecture Cohort"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Announcement Message Content (Max 5000 chars)
                </label>
                <textarea
                  rows={6}
                  maxLength={5000}
                  placeholder="Write your operational announcement message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedBatch || selectedBatch.enrolledCount === 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
              >
                Send Batch Announcement
              </button>
            </div>
          )}
        </form>
      )}

      {/* Action 3: Individual Student Email */}
      {tab === 'individual' && (
        <form onSubmit={handleIndividualSubmit} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-5 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Send Direct Operational Student Email</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sends an operational communication to an authorized active student in your cohorts.
            </p>
          </div>

          {options?.students.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500">
              No authorized active enrolled students found.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Target Student
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {options?.students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} • {st.batchName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudent && (
                <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded">
                  Target Recipient: <strong className="text-slate-900 dark:text-white">{selectedStudent.fullName}</strong> ({selectedStudent.batchName})
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Line (Max 200 chars)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="e.g. Assessment Feedback & Consultation"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Message Content (Max 5000 chars)
                </label>
                <textarea
                  rows={6}
                  maxLength={5000}
                  placeholder="Write your operational message to the student..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedStudent}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
              >
                Send Email to Student
              </button>
            </div>
          )}
        </form>
      )}

      {/* Action 4: Message History */}
      {tab === 'history' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Operational Message Log & History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Previously dispatched operational messages and honest submission statuses from notification providers.
              </p>
            </div>
            <button
              onClick={fetchHistory}
              disabled={historyLoading}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {historyLoading ? 'Refreshing...' : '🔄 Refresh Log'}
            </button>
          </div>

          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              No operational staff messages recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Action Type</th>
                    <th className="py-2.5 px-3">Target Scope</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Recipients</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.action === 'workshop_reminder' && '🗓️ Reminder'}
                          {item.action === 'batch_announcement' && '📢 Announcement'}
                          {item.action === 'individual_email' && '✉️ Direct Student'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                        {item.targetName}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {item.subject}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {item.recipientCount} sent
                        {item.failedCount > 0 && (
                          <span className="text-red-500 ml-1">({item.failedCount} failed)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.status === 'submitted' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Submitted to Provider
                          </span>
                        )}
                        {item.status === 'partially_failed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" title={item.failureReason || ''}>
                            Partially Failed
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" title={item.failureReason || ''}>
                            Dispatch Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Message Dispatch</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{confirmData.title}</p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-200 text-xs rounded-lg space-y-1">
              <p className="font-semibold">Server-Side Invariants:</p>
              <p>• Recipient list is resolved server-side from active enrollments with valid, non-revoked entitlements.</p>
              <p>• Duplicate submissions are protected by unique database idempotency key.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={isSending}
                onClick={() => setConfirmData(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={isSending}
                onClick={executeSend}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <span>Confirm & Send</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
