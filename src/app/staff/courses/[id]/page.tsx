'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Lesson = {
  id:string; title:string; order:number; contentType:string; contentData:any;
  isPreviewFree:boolean; unlockOverrideDays:number|null;
};
type Module = {
  id:string; title:string; description?:string; order:number; dripDaysAfterEnrollment:number; lessons:Lesson[];
};
type Course = {
  id:string; slug:string; title:string; description:string; level:string; thumbnailUrl:string;
  status:string; deliveryModes:string[]; estimatedHours:number;
};

export default function StaffCourseAuthoringPage({ params }: { params: Promise<{ id:string }> }) {
  const router = useRouter();
  const [courseId,setCourseId]=useState('');
  const [course,setCourse]=useState<Course|null>(null);
  const [modules,setModules]=useState<Module[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [moduleTitle,setModuleTitle]=useState('');
  const [moduleDrip,setModuleDrip]=useState(0);
  const [openLesson,setOpenLesson]=useState<string|null>(null);
  const [lessonForm,setLessonForm]=useState({
    title:'', contentType:'rich_text', bodyMarkdown:'', videoStorageKey:'', pdfStorageKey:'',
    isPreviewFree:false, unlockOverrideDays:''
  });

  useEffect(()=>{ params.then(p=>setCourseId(p.id)); },[params]);

  async function load(id=courseId) {
    if(!id) return;
    setLoading(true); setError('');
    try {
      const [courseRes,currRes]=await Promise.all([
        fetch('/api/v1/courses/'+id),
        fetch('/api/v1/courses/'+id+'/curriculum')
      ]);
      const courseJson=await courseRes.json(), currJson=await currRes.json();
      if(!courseJson.success) throw new Error(courseJson.error?.message||'Failed to load course.');
      if(!currJson.success) throw new Error(currJson.error?.message||'Failed to load curriculum.');
      setCourse(courseJson.data); setModules(currJson.data.modules);
    } catch(e) { setError(e instanceof Error?e.message:'Failed to load course.'); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ if(courseId) load(courseId); },[courseId]);

  async function updateCourse(patch:Record<string,unknown>) {
    if(!course) return;
    setSaving(true); setError('');
    try {
      const res=await fetch('/api/v1/courses/'+course.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});
      const json=await res.json(); if(!json.success) throw new Error(json.error?.message||'Failed to update course.');
      setCourse(json.data);
    } catch(e){setError(e instanceof Error?e.message:'Failed to update course.');}
    finally{setSaving(false);}
  }

  async function addModule(e:React.FormEvent) {
    e.preventDefault(); if(!moduleTitle.trim()) return;
    setSaving(true); setError('');
    try {
      const res=await fetch('/api/v1/courses/'+courseId+'/modules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:moduleTitle,dripDaysAfterEnrollment:Number(moduleDrip)})});
      const json=await res.json(); if(!json.success) throw new Error(json.error?.message||'Failed to create module.');
      setModuleTitle(''); setModuleDrip(0); await load();
    } catch(e){setError(e instanceof Error?e.message:'Failed to create module.');}
    finally{setSaving(false);}
  }

  function lessonContent() {
    if(lessonForm.contentType==='video') return {videoStorageKey:lessonForm.videoStorageKey};
    if(lessonForm.contentType==='pdf') return {pdfStorageKey:lessonForm.pdfStorageKey};
    if(lessonForm.contentType==='rich_text') return {bodyMarkdown:lessonForm.bodyMarkdown};
    if(lessonForm.contentType==='quiz') return {quizId:lessonForm.bodyMarkdown};
    if(lessonForm.contentType==='assignment') return {assignmentId:lessonForm.bodyMarkdown};
    return {};
  }

  async function saveLesson(moduleId:string, lesson?:Lesson) {
    setSaving(true); setError('');
    try {
      const payload={
        title:lessonForm.title, contentType:lessonForm.contentType, contentData:lessonContent(),
        isPreviewFree:lessonForm.isPreviewFree,
        unlockOverrideDays:lessonForm.unlockOverrideDays===''?null:Number(lessonForm.unlockOverrideDays)
      };
      const url='/api/v1/courses/'+courseId+'/modules/'+moduleId+'/lessons'+(lesson?'/'+lesson.id:'');
      const res=await fetch(url,{method:lesson?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const json=await res.json(); if(!json.success) throw new Error(json.error?.message||'Failed to save lesson.');
      setOpenLesson(null); await load();
    } catch(e){setError(e instanceof Error?e.message:'Failed to save lesson.');}
    finally{setSaving(false);}
  }

  function startLesson(moduleId:string, lesson?:Lesson) {
    if(lesson) {
      const d=lesson.contentData||{};
      setLessonForm({
        title:lesson.title, contentType:lesson.contentType,
        bodyMarkdown:d.bodyMarkdown||d.quizId||d.assignmentId||'', videoStorageKey:d.videoStorageKey||'',
        pdfStorageKey:d.pdfStorageKey||'', isPreviewFree:lesson.isPreviewFree,
        unlockOverrideDays:lesson.unlockOverrideDays===null?'':String(lesson.unlockOverrideDays)
      });
    } else {
      setLessonForm({title:'',contentType:'rich_text',bodyMarkdown:'',videoStorageKey:'',pdfStorageKey:'',isPreviewFree:false,unlockOverrideDays:''});
    }
    setOpenLesson(moduleId+(lesson?':'+lesson.id:':new'));
  }

  if(loading) return <div className="py-16 text-center text-slate-500">Loading authoring workspace…</div>;
  if(!course) return <div className="p-8 text-center">Course not found.</div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div><button onClick={()=>router.push('/staff/courses')} className="text-sm text-blue-600 hover:underline">← Courses</button><h1 className="text-2xl font-bold mt-2">{course.title}</h1><p className="text-xs text-slate-500">{course.slug}</p></div>
        <div className="flex gap-2">
          <select value={course.status} onChange={e=>updateCourse({status:e.target.value})} disabled={saving} className="px-3 py-2 rounded border bg-transparent text-sm"><option>draft</option><option>published</option><option>archived</option></select>
        </div>
      </div>
      {error && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="font-bold">Course Settings</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-sm font-medium">Title<input value={course.title} onChange={e=>setCourse({...course,title:e.target.value})} onBlur={()=>updateCourse({title:course.title})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
          <label className="text-sm font-medium">Estimated Hours<input type="number" min={0} value={course.estimatedHours} onChange={e=>setCourse({...course,estimatedHours:Number(e.target.value)})} onBlur={()=>updateCourse({estimatedHours:course.estimatedHours})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
        </div>
        <label className="text-sm font-medium">Description<textarea value={course.description} onChange={e=>setCourse({...course,description:e.target.value})} onBlur={()=>updateCourse({description:course.description})} className="mt-1 w-full p-2 rounded border bg-transparent min-h-24"/></label>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-sm font-medium">Level<select value={course.level} onChange={e=>updateCourse({level:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"><option>beginner</option><option>intermediate</option><option>advanced</option><option>professional</option></select></label>
          <label className="text-sm font-medium">Delivery<select value={course.deliveryModes[0]||'self_paced'} onChange={e=>updateCourse({deliveryModes:[e.target.value]})} className="mt-1 w-full p-2 rounded border bg-transparent"><option value="self_paced">Self paced</option><option value="cohort_batch">Cohort batch</option></select></label>
        </div>
      </section>

      <section className="space-y-4">
        <div><h2 className="text-xl font-bold">Curriculum</h2><p className="text-sm text-slate-500">Modules and lessons are canonical learning content.</p></div>
        {modules.map((m,i)=>(
          <div key={m.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/50 flex flex-wrap justify-between gap-3">
              <div><h3 className="font-bold">Module {i+1}: {m.title}</h3><p className="text-xs text-slate-500">Drip: {m.dripDaysAfterEnrollment} days</p></div>
              <button onClick={()=>startLesson(m.id)} className="px-3 py-2 rounded bg-blue-600 text-white text-xs font-semibold">+ Add Lesson</button>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {m.lessons.map(l=>(
                <div key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div><p className="font-semibold text-sm">{l.title}</p><p className="text-xs text-slate-500">{l.contentType} {l.isPreviewFree?'• Preview':''} {l.unlockOverrideDays!==null?'• Unlock +'+l.unlockOverrideDays+'d':''}</p></div>
                  <button onClick={()=>startLesson(m.id,l)} className="text-xs font-semibold text-blue-600 hover:underline">Edit lesson</button>
                </div>
              ))}
              {m.lessons.length===0 && <div className="p-5 text-sm text-slate-500">No lessons yet.</div>}
            </div>
          </div>
        ))}
        {modules.length===0 && <div className="p-10 text-center border border-dashed rounded-xl text-slate-500">Create your first module below.</div>}
      </section>

      <form onSubmit={addModule} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <h2 className="font-bold mb-3">Add Module</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input required value={moduleTitle} onChange={e=>setModuleTitle(e.target.value)} placeholder="Module title" className="flex-1 p-2 rounded border bg-transparent"/>
          <input type="number" min={0} value={moduleDrip} onChange={e=>setModuleDrip(Number(e.target.value))} className="w-36 p-2 rounded border bg-transparent" title="Drip days"/>
          <button disabled={saving} className="px-4 py-2 rounded bg-slate-900 text-white font-semibold">{saving?'Saving…':'Add Module'}</button>
        </div>
      </form>

      {openLesson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between"><h2 className="text-lg font-bold">{openLesson.endsWith(':new')?'Add Lesson':'Edit Lesson'}</h2><button onClick={()=>setOpenLesson(null)}>✕</button></div>
            <label className="text-sm font-medium">Lesson Title<input value={lessonForm.title} onChange={e=>setLessonForm({...lessonForm,title:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium">Content Type<select value={lessonForm.contentType} onChange={e=>setLessonForm({...lessonForm,contentType:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"><option value="rich_text">Rich text</option><option value="video">Video</option><option value="pdf">PDF</option><option value="quiz">Quiz</option><option value="assignment">Assignment</option></select></label>
              <label className="text-sm font-medium">Unlock Override (days)<input type="number" min={0} value={lessonForm.unlockOverrideDays} onChange={e=>setLessonForm({...lessonForm,unlockOverrideDays:e.target.value})} placeholder="Module default" className="mt-1 w-full p-2 rounded border bg-transparent"/></label>
            </div>
            {lessonForm.contentType==='video' && <label className="text-sm font-medium">Video Storage Key<input value={lessonForm.videoStorageKey} onChange={e=>setLessonForm({...lessonForm,videoStorageKey:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>}
            {lessonForm.contentType==='pdf' && <label className="text-sm font-medium">PDF Storage Key<input value={lessonForm.pdfStorageKey} onChange={e=>setLessonForm({...lessonForm,pdfStorageKey:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent"/></label>}
            {(lessonForm.contentType==='rich_text'||lessonForm.contentType==='quiz'||lessonForm.contentType==='assignment') && <label className="text-sm font-medium">{lessonForm.contentType==='rich_text'?'Markdown Body':lessonForm.contentType==='quiz'?'Quiz ID':'Assignment ID'}<textarea value={lessonForm.bodyMarkdown} onChange={e=>setLessonForm({...lessonForm,bodyMarkdown:e.target.value})} className="mt-1 w-full p-2 rounded border bg-transparent min-h-32"/></label>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lessonForm.isPreviewFree} onChange={e=>setLessonForm({...lessonForm,isPreviewFree:e.target.checked})}/> Free preview</label>
            <div className="flex justify-end gap-3 pt-3 border-t"><button onClick={()=>setOpenLesson(null)} className="px-4 py-2 border rounded">Cancel</button><button disabled={saving} onClick={()=>{const parts=openLesson.split(':'); const moduleId=parts[0]; const lessonId=parts[1]; const lesson=lessonId&&lessonId!=='new'?modules.flatMap(m=>m.lessons).find(l=>l.id===lessonId):undefined; saveLesson(moduleId,lesson)}} className="px-4 py-2 bg-blue-600 text-white rounded font-semibold">{saving?'Saving…':'Save Lesson'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
