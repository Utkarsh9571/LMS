'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  BookOpen, 
  Video, 
  FileText, 
  HelpCircle, 
  CheckSquare, 
  Lock, 
  Save, 
  AlertCircle,
  Upload,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface ILessonResource {
  title: string;
  storageKey: string;
  fileSizeBytes: number;
  mimeType: string;
  downloadAllowed: boolean;
}

interface ILessonDetail {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  order: number;
  contentType: 'video' | 'pdf' | 'rich_text' | 'quiz' | 'assignment';
  contentData: {
    videoStorageKey?: string;
    durationSeconds?: number;
    pdfStorageKey?: string;
    bodyMarkdown?: string;
    quizId?: string;
    assignmentId?: string;
  };
  isPreviewFree: boolean;
  unlockOverrideDays?: number | null;
  effectiveDripDays?: number;
  resources: ILessonResource[];
  createdAt: string;
}

interface ICourseCurriculum {
  course: {
    id: string;
    title: string;
    slug: string;
  };
  modules: Array<{
    id: string;
    title: string;
    dripDaysAfterEnrollment: number;
    lessons: ILessonDetail[];
  }>;
}

export default function StaffLessonAuthoringPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = use(params);
  const [curriculum, setCurriculum] = useState<ICourseCurriculum | null>(null);
  const [lesson, setLesson] = useState<ILessonDetail | null>(null);
  const [parentModule, setParentModule] = useState<{ id: string; title: string; dripDays: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable Form State
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    contentType: 'video' as 'video' | 'pdf' | 'rich_text' | 'quiz' | 'assignment',
    isPreviewFree: false,
    unlockOverrideDays: '',
    // Content Data
    videoStorageKey: '',
    durationMinutes: 0,
    pdfStorageKey: '',
    bodyMarkdown: '',
    quizId: '',
    assignmentId: '',
    // Resources
    resources: [] as ILessonResource[]
  });

  const fetchLessonData = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/v1/courses/${courseId}/curriculum`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setCurriculum(res.data);
          let foundLesson: ILessonDetail | null = null;
          let foundMod: { id: string; title: string; dripDays: number } | null = null;

          for (const mod of res.data.modules) {
            const l = mod.lessons.find((lsn: ILessonDetail) => lsn.id === lessonId);
            if (l) {
              foundLesson = l;
              foundMod = { id: mod.id, title: mod.title, dripDays: mod.dripDaysAfterEnrollment };
              break;
            }
          }

          if (foundLesson && foundMod) {
            setLesson(foundLesson);
            setParentModule(foundMod);
            setForm({
              title: foundLesson.title,
              contentType: foundLesson.contentType,
              isPreviewFree: foundLesson.isPreviewFree,
              unlockOverrideDays: foundLesson.unlockOverrideDays !== null && foundLesson.unlockOverrideDays !== undefined
                ? String(foundLesson.unlockOverrideDays)
                : '',
              videoStorageKey: foundLesson.contentData?.videoStorageKey || '',
              durationMinutes: foundLesson.contentData?.durationSeconds ? Math.round(foundLesson.contentData.durationSeconds / 60) : 0,
              pdfStorageKey: foundLesson.contentData?.pdfStorageKey || '',
              bodyMarkdown: foundLesson.contentData?.bodyMarkdown || '',
              quizId: foundLesson.contentData?.quizId || '',
              assignmentId: foundLesson.contentData?.assignmentId || '',
              resources: foundLesson.resources || []
            });
          } else {
            setError('Lesson not found in course curriculum.');
          }
        } else {
          setError(res.error?.message || 'Failed to load lesson authoring workspace.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLessonData();
  }, [courseId, lessonId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentModule || !lesson) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const unlockDays = form.unlockOverrideDays.trim() !== ''
      ? Number(form.unlockOverrideDays)
      : null;

    const contentDataPayload: any = {};
    if (form.contentType === 'video') {
      contentDataPayload.videoStorageKey = form.videoStorageKey.trim();
      contentDataPayload.durationSeconds = Math.max(0, form.durationMinutes * 60);
    } else if (form.contentType === 'pdf') {
      contentDataPayload.pdfStorageKey = form.pdfStorageKey.trim();
    } else if (form.contentType === 'rich_text') {
      contentDataPayload.bodyMarkdown = form.bodyMarkdown;
    } else if (form.contentType === 'quiz') {
      contentDataPayload.quizId = form.quizId.trim() || undefined;
    } else if (form.contentType === 'assignment') {
      contentDataPayload.assignmentId = form.assignmentId.trim() || undefined;
    }

    try {
      const res = await fetch(`/api/v1/courses/${courseId}/modules/${parentModule.id}/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          contentType: form.contentType,
          isPreviewFree: form.isPreviewFree,
          unlockOverrideDays: unlockDays,
          contentData: contentDataPayload,
          resources: form.resources
        })
      });

      const resJson = await res.json();
      if (resJson.success) {
        setSaveSuccess('Lesson content and metadata saved successfully.');
        fetchLessonData();
      } else {
        setSaveError(resJson.error?.message || 'Failed to save lesson changes.');
      }
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddResource = () => {
    setForm((prev) => ({
      ...prev,
      resources: [
        ...prev.resources,
        {
          title: 'Supplementary Resource Document',
          storageKey: 'resources/sample-document.pdf',
          fileSizeBytes: 1024500,
          mimeType: 'application/pdf',
          downloadAllowed: true
        }
      ]
    }));
  };

  const handleRemoveResource = (index: number) => {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !lesson || !curriculum || !parentModule) {
    return (
      <ErrorState
        title="Lesson Authoring Workspace Error"
        message={error || 'Lesson workspace unavailable.'}
        action={
          <Button size="sm" variant="outline" onClick={fetchLessonData}>
            Retry Load
          </Button>
        }
      />
    );
  }

  const effectiveDripDays = form.unlockOverrideDays.trim() !== ''
    ? Number(form.unlockOverrideDays)
    : parentModule.dripDays;

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          href={`/staff/courses/${courseId}`}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Course Curriculum ({curriculum.course.title})</span>
        </Link>

        <PageHeader
          title={`Lesson Authoring: ${lesson.title}`}
          description={`Module: ${parentModule.title} • Course: ${curriculum.course.title}`}
        >
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Lesson Changes'}</span>
          </Button>
        </PageHeader>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Lesson Settings Card */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            1. Lesson Metadata & Access Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lesson Title *
              </label>
              <Input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Content Type *
              </label>
              <Select
                value={form.contentType}
                onChange={(e) => setForm({ ...form, contentType: e.target.value as any })}
                options={[
                  { value: 'video', label: 'Video Lecture' },
                  { value: 'pdf', label: 'PDF Document' },
                  { value: 'rich_text', label: 'Rich Text / Article' },
                  { value: 'quiz', label: 'Interactive Quiz' },
                  { value: 'assignment', label: 'Project Assignment' }
                ]}
              />
            </div>
          </div>

          {/* Drip & Preview Semantics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lesson Unlock Override (Days)
              </label>
              <Input
                type="number"
                min={0}
                value={form.unlockOverrideDays}
                onChange={(e) => setForm({ ...form, unlockOverrideDays: e.target.value })}
                placeholder={`Inherit from Module (${parentModule.dripDays} days)`}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Effective Drip Delay:{' '}
                <strong className="text-slate-700 dark:text-slate-300">{effectiveDripDays} Days</strong> after enrollment.
              </p>
            </div>

            <div className="flex flex-col justify-center pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="authorIsPreviewFree"
                  checked={form.isPreviewFree}
                  onChange={(e) => setForm({ ...form, isPreviewFree: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="authorIsPreviewFree" className="text-xs font-bold text-slate-900 dark:text-white">
                  Allow Free Public Preview
                </label>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                If checked, non-enrolled students can access this lesson before purchasing.
              </p>
            </div>
          </div>
        </Card>

        {/* Content-Type Specific Editor */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            2. Lesson Content Editor ({form.contentType.toUpperCase().replace('_', ' ')})
          </h2>

          {form.contentType === 'video' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Video Asset Storage Key (S3 / Storage Provider) *
                </label>
                <Input
                  type="text"
                  value={form.videoStorageKey}
                  onChange={(e) => setForm({ ...form, videoStorageKey: e.target.value })}
                  placeholder="e.g. videos/courses/revit-masterclass-lesson-1.mp4"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Canonical storage key reference. Private signed URLs are dynamically generated at runtime.
                </p>
              </div>

              <div className="w-48">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Video Duration (Minutes)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          {form.contentType === 'pdf' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  PDF Document Storage Key (S3 / Storage Provider) *
                </label>
                <Input
                  type="text"
                  value={form.pdfStorageKey}
                  onChange={(e) => setForm({ ...form, pdfStorageKey: e.target.value })}
                  placeholder="e.g. documents/courses/revit-standards-guide.pdf"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Canonical storage key reference. PDF viewer resolves temporary read tokens safely.
                </p>
              </div>
            </div>
          )}

          {form.contentType === 'rich_text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lesson Article Body (Markdown)
                </label>
                <textarea
                  rows={10}
                  value={form.bodyMarkdown}
                  onChange={(e) => setForm({ ...form, bodyMarkdown: e.target.value })}
                  placeholder="# Lesson Overview&#10;&#10;Write comprehensive lecture notes, code snippets, or architectural guides using Markdown..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {form.contentType === 'quiz' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <HelpCircle className="w-4 h-4" />
                <span>Interactive Assessment / Quiz Domain Boundary</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                Quiz questions, options, and pass criteria remain governed by QuizService. Specify the target Quiz ObjectId below to link this lesson to its assessment definition.
              </p>
              <Input
                type="text"
                value={form.quizId}
                onChange={(e) => setForm({ ...form, quizId: e.target.value })}
                placeholder="Target Quiz ID (24-char ObjectId)"
              />
            </div>
          )}

          {form.contentType === 'assignment' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                <CheckSquare className="w-4 h-4" />
                <span>Project Assignment Domain Boundary</span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                Project submission rules and rubric requirements are managed via AssignmentService. Specify the target Assignment ObjectId below to link this lesson.
              </p>
              <Input
                type="text"
                value={form.assignmentId}
                onChange={(e) => setForm({ ...form, assignmentId: e.target.value })}
                placeholder="Target Assignment ID (24-char ObjectId)"
              />
            </div>
          )}
        </Card>

        {/* Supplementary Downloadable Resources */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              3. Supplementary Downloadable Resources ({form.resources.length})
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddResource}
              className="text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Resource</span>
            </Button>
          </div>

          {form.resources.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              No supplementary resources attached to this lesson.
            </p>
          ) : (
            <div className="space-y-3">
              {form.resources.map((res, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-2 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Input
                      type="text"
                      value={res.title}
                      onChange={(e) => {
                        const updated = [...form.resources];
                        updated[index].title = e.target.value;
                        setForm({ ...form, resources: updated });
                      }}
                      placeholder="Resource Title"
                      className="font-bold text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveResource(index)}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 p-1.5 h-auto shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      type="text"
                      value={res.storageKey}
                      onChange={(e) => {
                        const updated = [...form.resources];
                        updated[index].storageKey = e.target.value;
                        setForm({ ...form, resources: updated });
                      }}
                      placeholder="Resource Storage Key"
                      className="font-mono text-[11px]"
                    />
                    <Input
                      type="text"
                      value={res.mimeType}
                      onChange={(e) => {
                        const updated = [...form.resources];
                        updated[index].mimeType = e.target.value;
                        setForm({ ...form, resources: updated });
                      }}
                      placeholder="MIME Type (e.g. application/pdf)"
                      className="text-[11px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </form>
    </div>
  );
}
