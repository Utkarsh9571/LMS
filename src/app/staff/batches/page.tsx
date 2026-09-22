'use client';

import React, { useEffect, useState } from 'react';

interface CourseOption { id: string; title: string; }
interface Batch {
  id: string;
  code: string;
  name: string;
  courseId: string;
  status: string;
  capacity: number;
  enrolledCount: number;
  startDate: string;
  endDate: string;
}

export default function StaffBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    courseId: '',
    code: '',
    name: '',
    description: '',
    capacity: 30,
    startDate: '',
    endDate: '',
    enrollmentOpenAt: '',
    enrollmentCloseAt: '',
    meetingProvider: 'zoom'
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [batchRes, courseRes] = await Promise.all([
        fetch('/api/v1/batches'),
        fetch('/api/v1/courses')
      ]);
      const batchJson = await batchRes.json();
      const courseJson = await courseRes.json();
      if (!batchJson.success) throw new Error(batchJson.error?.message || 'Failed to load batches.');
      if (!courseJson.success) throw new Error(courseJson.error?.message || 'Failed to load courses.');
      setBatches(batchJson.data);
      const courseOptions = courseJson.data.map((c: any) => ({ id: c.id, title: c.title }));
      setCourses(courseOptions);
      if (!form.courseId && courseOptions[0]) setForm(prev => ({ ...prev, courseId: courseOptions[0].id }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load batches.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openEnrollment(batch: Batch) {
    setError(null);
    try {
      const first = await fetch(`/api/v1/batches/${batch.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'upcoming' }) });
      const firstJson = await first.json();
      if (!firstJson.success) throw new Error(firstJson.error?.message || 'Failed to prepare batch.');
      const second = await fetch(`/api/v1/batches/${batch.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'enrolling' }) });
      const secondJson = await second.json();
      if (!secondJson.success) throw new Error(secondJson.error?.message || 'Failed to open enrollment.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to open enrollment.'); }
  }

  async function createBatch(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: form.courseId,
          code: form.code,
          name: form.name,
          description: form.description || undefined,
          capacity: Number(form.capacity),
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          enrollmentOpenAt: form.enrollmentOpenAt ? new Date(form.enrollmentOpenAt).toISOString() : null,
          enrollmentCloseAt: form.enrollmentCloseAt ? new Date(form.enrollmentCloseAt).toISOString() : null,
          meetingProvider: form.meetingProvider
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create batch.');
      setOpen(false);
      setForm(prev => ({ ...prev, code: '', name: '', description: '', capacity: 30, startDate: '', endDate: '', enrollmentOpenAt: '', enrollmentCloseAt: '' }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create batch.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Batches & Cohorts</h1>
          <p className="text-sm text-slate-500 mt-1">Create the class groups that customers select during checkout.</p>
        </div>
        <button onClick={() => setOpen(true)} className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
          + Create Batch
        </button>
      </div>

      {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {loading ? <div className="py-16 text-center text-slate-500">Loading batches…</div> : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500">
              <tr><th className="p-4">Batch</th><th className="p-4">Status</th><th className="p-4">Dates</th><th className="p-4">Capacity</th><th className="p-4">Provider</th><th className="p-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {batches.map(b => (
                <tr key={b.id}>
                  <td className="p-4"><div className="font-semibold">{b.name}</div><div className="text-xs text-slate-500">{b.code}</div></td>
                  <td className="p-4"><span className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800">{b.status}</span></td>
                  <td className="p-4 text-xs">{new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}</td>
                  <td className="p-4">{b.enrolledCount}/{b.capacity}</td>
                  <td className="p-4 uppercase text-xs">{(b as any).meetingProvider}</td><td className="p-4 text-right">{b.status === 'draft' && <button onClick={() => openEnrollment(b)} className="text-xs font-semibold text-blue-600 hover:underline">Open enrollment</button>}</td>
                </tr>
              ))}
              {batches.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-500">No batches created yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={createBatch} className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Create Batch / Cohort</h2><button type="button" onClick={() => setOpen(false)}>✕</button></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium">Course<select required value={form.courseId} onChange={e => setForm({...form, courseId:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent">{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
              <label className="text-sm font-medium">Batch Code<input required value={form.code} onChange={e => setForm({...form, code:e.target.value})} placeholder="BIM-SG-OCT-WD" className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
            </div>
            <label className="text-sm font-medium">Batch Name<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Weekday Evening Batch" className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
            <label className="text-sm font-medium">Description<textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="text-sm font-medium">Capacity<input required type="number" min={1} value={form.capacity} onChange={e => setForm({...form, capacity:Number(e.target.value)})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
              <label className="text-sm font-medium">Start<input required type="datetime-local" value={form.startDate} onChange={e => setForm({...form, startDate:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
              <label className="text-sm font-medium">End<input required type="datetime-local" value={form.endDate} onChange={e => setForm({...form, endDate:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium">Enrollment Opens<input type="datetime-local" value={form.enrollmentOpenAt} onChange={e => setForm({...form, enrollmentOpenAt:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
              <label className="text-sm font-medium">Enrollment Closes<input type="datetime-local" value={form.enrollmentCloseAt} onChange={e => setForm({...form, enrollmentCloseAt:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
            </div>
            <label className="text-sm font-medium">Meeting Provider<select value={form.meetingProvider} onChange={e => setForm({...form, meetingProvider:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"><option value="zoom">Zoom</option><option value="google_meet">Google Meet</option><option value="mock">Mock</option></select></label>
            <div className="flex justify-end gap-3 pt-3 border-t"><button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded border">Cancel</button><button disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-50">{saving ? 'Creating…' : 'Create Batch'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
