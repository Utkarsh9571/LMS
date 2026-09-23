'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  BookOpen, 
  Layers, 
  Clock, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Video, 
  FileText, 
  HelpCircle, 
  CheckSquare, 
  Lock, 
  Sparkles, 
  AlertCircle,
  Eye,
  GripVertical,
  Edit2,
  Calendar
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';

interface ILesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  order: number;
  contentType: 'video' | 'pdf' | 'rich_text' | 'quiz' | 'assignment';
  isPreviewFree: boolean;
  unlockOverrideDays?: number | null;
  effectiveDripDays?: number;
  createdAt: string;
}

interface IModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  dripDaysAfterEnrollment: number;
  lessons: ILesson[];
}

interface ICourseDetail {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    level: string;
    thumbnailUrl: string;
    status: string;
    deliveryModes: string[];
    estimatedHours: number;
    createdAt: string;
    updatedAt: string;
  };
  modules: IModule[];
}

export default function StaffCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const [data, setData] = useState<ICourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded Module States
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Module Creation Dialog State
  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    dripDaysAfterEnrollment: 0
  });

  // Lesson Creation Dialog State
  const [isLessonOpen, setIsLessonOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    contentType: 'video' as 'video' | 'pdf' | 'rich_text' | 'quiz' | 'assignment',
    isPreviewFree: false,
    unlockOverrideDays: ''
  });

  const fetchCurriculum = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/v1/courses/${courseId}/curriculum`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
          // Expand all modules by default
          const exp: Record<string, boolean> = {};
          res.data.modules.forEach((m: IModule) => {
            exp[m.id] = true;
          });
          setExpandedModules(exp);
        } else {
          setError(res.error?.message || 'Failed to load course curriculum.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCurriculum();
  }, [courseId]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setModuleError(null);
    if (!moduleForm.title) {
      setModuleError('Module title is required.');
      return;
    }

    setModuleLoading(true);
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: moduleForm.title,
          description: moduleForm.description,
          dripDaysAfterEnrollment: Number(moduleForm.dripDaysAfterEnrollment)
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setIsModuleOpen(false);
        setModuleForm({ title: '', description: '', dripDaysAfterEnrollment: 0 });
        fetchCurriculum();
      } else {
        setModuleError(resJson.error?.message || 'Failed to create module.');
      }
    } catch (err: any) {
      setModuleError(err.message);
    } finally {
      setModuleLoading(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLessonError(null);
    if (!selectedModuleId || !lessonForm.title) {
      setLessonError('Lesson title is required.');
      return;
    }

    setLessonLoading(true);
    try {
      const unlockOverride = lessonForm.unlockOverrideDays !== ''
        ? Number(lessonForm.unlockOverrideDays)
        : null;

      const res = await fetch(`/api/v1/courses/${courseId}/modules/${selectedModuleId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: lessonForm.title,
          contentType: lessonForm.contentType,
          isPreviewFree: lessonForm.isPreviewFree,
          unlockOverrideDays: unlockOverride,
          contentData: {}
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setIsLessonOpen(false);
        setLessonForm({
          title: '',
          contentType: 'video',
          isPreviewFree: false,
          unlockOverrideDays: ''
        });
        setSelectedModuleId(null);
        fetchCurriculum();
      } else {
        setLessonError(resJson.error?.message || 'Failed to create lesson.');
      }
    } catch (err: any) {
      setLessonError(err.message);
    } finally {
      setLessonLoading(false);
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'rich_text':
        return <BookOpen className="w-4 h-4 text-purple-500" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4 text-amber-500" />;
      case 'assignment':
        return <CheckSquare className="w-4 h-4 text-rose-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Course Curriculum Load Error"
        message={error || 'Course details unavailable.'}
        action={
          <Button size="sm" variant="outline" onClick={fetchCurriculum}>
            Retry Load
          </Button>
        }
      />
    );
  }

  const { course, modules } = data;
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/staff/courses"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Course Catalog</span>
        </Link>

        <PageHeader
          title={course.title}
          description={`Slug: /${course.slug} • ${course.estimatedHours} Hours • ${course.level.toUpperCase()} Level`}
        >
          <div className="flex items-center gap-2">
            <Badge
              variant={
                course.status === 'published'
                  ? 'success'
                  : course.status === 'draft'
                  ? 'warning'
                  : 'secondary'
              }
              className="uppercase font-bold"
            >
              {course.status}
            </Badge>
            <Button
              onClick={() => setIsModuleOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Module</span>
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* Course Metadata Overview Banner */}
      <Card className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              {modules.length} Modules
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              {totalLessons} Total Lessons
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              {course.estimatedHours} Estimated Hours
            </span>
          </div>

          <Badge variant="outline" className="border-slate-700 text-slate-300 font-mono text-[10px]">
            Delivery: {course.deliveryModes.join(', ')}
          </Badge>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          {course.description}
        </p>
      </Card>

      {/* Canonical Modules & Lessons Hierarchy */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Canonical Curriculum Hierarchy</span>
          </h2>
          <span className="text-xs text-slate-500">
            Canonical Order Maintained by Server
          </span>
        </div>

        {modules.length === 0 ? (
          <EmptyState
            title="No Modules Created"
            description="This course currently has no curriculum modules. Click 'Add Module' above to build out the learning structure."
          />
        ) : (
          <div className="space-y-4">
            {modules.map((moduleItem, mIdx) => {
              const isExpanded = expandedModules[moduleItem.id] ?? true;

              return (
                <Card key={moduleItem.id} className="p-0 overflow-hidden border-slate-200 dark:border-slate-800">
                  {/* Module Bar */}
                  <div
                    onClick={() => toggleModule(moduleItem.id)}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" className="p-1 h-auto text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">
                            Module {mIdx + 1}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {moduleItem.title}
                          </h3>
                        </div>
                        {moduleItem.description && (
                          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                            {moduleItem.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        Drip: {moduleItem.dripDaysAfterEnrollment} Days After Enrollment
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {moduleItem.lessons.length} Lessons
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedModuleId(moduleItem.id);
                          setIsLessonOpen(true);
                        }}
                        className="text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Lesson</span>
                      </Button>
                    </div>
                  </div>

                  {/* Lessons List inside Module */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
                      {moduleItem.lessons.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No lessons added to this module yet.
                        </div>
                      ) : (
                        moduleItem.lessons.map((lessonItem, lIdx) => (
                          <div
                            key={lessonItem.id}
                            className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-slate-400 font-semibold w-6 text-right">
                                {lIdx + 1}.
                              </span>
                              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                                {getLessonIcon(lessonItem.contentType)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">
                                  {lessonItem.title}
                                </p>
                                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                                  <span className="capitalize font-medium">Type: {lessonItem.contentType.replace('_', ' ')}</span>
                                  <span>•</span>
                                  <span>
                                    Effective Drip:{' '}
                                    <strong className="text-slate-700 dark:text-slate-300">
                                      {lessonItem.effectiveDripDays ?? moduleItem.dripDaysAfterEnrollment} Days
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {lessonItem.isPreviewFree ? (
                                <Badge variant="success" className="text-[10px] font-bold uppercase">
                                  Free Preview
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] font-bold uppercase flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Protected
                                </Badge>
                              )}

                              <Link href={`/staff/courses/${courseId}/lessons/${lessonItem.id}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs font-semibold flex items-center gap-1.5"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Edit Lesson</span>
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Module Dialog */}
      <Dialog
        isOpen={isModuleOpen}
        onClose={() => setIsModuleOpen(false)}
        title="Add Curriculum Module"
        description="Create a new module container in this course curriculum hierarchy."
      >
        {moduleError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{moduleError}</span>
          </div>
        )}

        <form onSubmit={handleCreateModule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Module Title *
            </label>
            <Input
              type="text"
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
              placeholder="e.g. Module 1: Architectural BIM Setup & Standards"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Learning Objective
            </label>
            <Input
              type="text"
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              placeholder="Summary of module goals and skills..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Drip Delay (Days After Enrollment) *
            </label>
            <Input
              type="number"
              min={0}
              value={moduleForm.dripDaysAfterEnrollment}
              onChange={(e) => setModuleForm({ ...moduleForm, dripDaysAfterEnrollment: Number(e.target.value) })}
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModuleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={moduleLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {moduleLoading ? 'Saving...' : 'Add Module'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog
        isOpen={isLessonOpen}
        onClose={() => setIsLessonOpen(false)}
        title="Add Curriculum Lesson"
        description="Add a lesson unit to the selected curriculum module."
      >
        {lessonError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lessonError}</span>
          </div>
        )}

        <form onSubmit={handleCreateLesson} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lesson Title *
            </label>
            <Input
              type="text"
              value={lessonForm.title}
              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
              placeholder="e.g. Lesson 1.1: Navigating Revit Worksets"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Content Type *
              </label>
              <Select
                value={lessonForm.contentType}
                onChange={(e) => setLessonForm({ ...lessonForm, contentType: e.target.value as any })}
                options={[
                  { value: 'video', label: 'Video Lecture' },
                  { value: 'pdf', label: 'PDF Document' },
                  { value: 'rich_text', label: 'Rich Text / Article' },
                  { value: 'quiz', label: 'Interactive Quiz' },
                  { value: 'assignment', label: 'Project Assignment' }
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unlock Override Days (Optional)
              </label>
              <Input
                type="number"
                min={0}
                value={lessonForm.unlockOverrideDays}
                onChange={(e) => setLessonForm({ ...lessonForm, unlockOverrideDays: e.target.value })}
                placeholder="Inherit from module if empty"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPreviewFree"
              checked={lessonForm.isPreviewFree}
              onChange={(e) => setLessonForm({ ...lessonForm, isPreviewFree: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="isPreviewFree" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Allow Free Public Preview (No Enrollment Required)
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLessonOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={lessonLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {lessonLoading ? 'Saving...' : 'Add Lesson'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
