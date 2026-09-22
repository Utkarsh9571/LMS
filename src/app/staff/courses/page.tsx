'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Course = {
  id: string; slug: string; title: string; description: string; level: string;
  status: string; deliveryModes: string[]; estimatedHours: number;
};

export default function StaffCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: '', title: '', description: '', level: 'beginner', thumbnailUrl: '',
    status: 'draft', deliveryMode: 'self_paced', estimatedHours: 0
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/courses');
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to load courses.');
      setCourses(json.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load courses.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function createCourse(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await fetch('/api/v1/courses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug, title: form.title, description: form.description,
          level: form.level, thumbnailUrl: form.thumbnailUrl,
          status: form.status, deliveryModes: [form.deliveryMode],
          estimatedHours: Number(form.estimatedHours)
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create course.');
      setOpen(false);
      setForm({ slug:'', title:'', description:'', level:'beginner', thumbnailUrl:'', status:'draft', deliveryMode:'self_paced', estimatedHours:0 });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create course.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Courses & Curriculum</h1>
          <p className="text-sm text-slate-500 mt-1">Author canonical learning content before attaching commercial offers.</p>
        </div>
        <button onClick={() => setOpen(true)} className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm">+ Create Course</button>
      </div>
      {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {loading ? <div className="py-16 text-center text-slate-500">Loading courses…</div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map(c => (
            <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex justify-between gap-3">
                <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">{c.status}</span>
                <span className="text-xs text-slate-500">{c.estimatedHours}h</span>
              </div>
              <div>
                <h2 className="font-bold text-lg">{c.title}</h2>
                <p className="text-xs text-slate-500 mt-1">{c.slug}</p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{c.description}</p>
              <div className="flex flex-wrap gap-2">{c.deliveryModes.map(m => <span key={m} className="text-xs rounded bg-blue-50 dark:bg-blue-950/40 px-2 py-1">{m}</span>)}</div>
              <Link href={`/staff/courses/${c.id}`} className="block text-center px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold">Open Authoring</Link>
            </div>
          ))}
          {courses.length === 0 && <div className="md:col-span-2 xl:col-span-3 p-12 text-center text-slate-500">No courses yet.</div>}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={createCourse} className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between"><h2 className="text-lg font-bold">Create Course</h2><button type="button" onClick={() => setOpen(false)}>✕</button></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium">Slug<input required pattern="[a-z0-9-]+" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
              <label className="text-sm font-medium">Title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
            </div>
            <label className="text-sm font-medium">Description<textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium">Level<select value={form.level} onChange={e=>setForm({...form,level:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"><option>beginner</option><option>intermediate</option><option>advanced</option><option>professional</option></select></label>
              <label className="text-sm font-medium">Delivery<select value={form.deliveryMode} onChange={e=>setForm({...form,deliveryMode:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"><option value="self_paced">Self paced</option><option value="cohort_batch">Cohort batch</option></select></label>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="text-sm font-medium">Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"><option>draft</option><option>published</option></select></label>
              <label className="text-sm font-medium">Hours<input type="number" min={0} value={form.estimatedHours} onChange={e=>setForm({...form,estimatedHours:Number(e.target.value)})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
              <label className="text-sm font-medium">Thumbnail URL<input value={form.thumbnailUrl} onChange={e=>setForm({...form,thumbnailUrl:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t"><button type="button" onClick={()=>setOpen(false)} className="px-4 py-2 border rounded">Cancel</button><button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded font-semibold">{saving?'Creating…':'Create Course'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
