'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MarkCompleteButton } from '@/components/learning/mark-complete-button';
import { StudentQuizRunner } from '@/components/learning/student-quiz-runner';
import { StudentAssignmentUploader } from '@/components/learning/student-assignment-uploader';
import {
  BookOpen,
  Video,
  FileText,
  HelpCircle,
  FileCheck,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Clock,
  Download,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export interface CurriculumLessonItem {
  id: string;
  title: string;
  contentType: 'video' | 'pdf' | 'rich_text' | 'quiz' | 'assignment';
  isCompleted: boolean;
  accessGranted: boolean;
  accessReason?: string;
  daysRemaining?: number;
}

export interface CurriculumModuleItem {
  id: string;
  title: string;
  order: number;
  lessons: CurriculumLessonItem[];
}

export interface StudentLessonPlayerProps {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  contentType: 'video' | 'pdf' | 'rich_text' | 'quiz' | 'assignment';
  isPreviewFree: boolean;
  contentData: {
    videoStorageKey?: string;
    videoReadUrl?: string | null;
    durationSeconds?: number;
    pdfStorageKey?: string;
    pdfReadUrl?: string | null;
    bodyMarkdown?: string;
    quizId?: string;
    assignmentId?: string;
  };
  resources: Array<{
    title: string;
    storageKey: string;
    fileSizeBytes: number;
    mimeType: string;
    downloadAllowed: boolean;
    downloadUrl?: string | null;
  }>;
  isCompleted: boolean;
  enrollmentId: string;
  progressPercent: number;
  batchInfo?: {
    code: string;
    name: string;
    nextSession?: {
      title: string;
      startTime: string;
    } | null;
  } | null;
  modules: CurriculumModuleItem[];
  prevLesson: { id: string; title: string; granted: boolean } | null;
  nextLesson: { id: string; title: string; granted: boolean; reason?: string; daysRemaining?: number } | null;
}

export function StudentLessonPlayerShell({
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
  contentType,
  isPreviewFree,
  contentData,
  resources,
  isCompleted,
  enrollmentId,
  progressPercent,
  batchInfo,
  modules,
  prevLesson,
  nextLesson
}: StudentLessonPlayerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Compute overall lesson counters
  let totalLessonsCount = 0;
  let completedLessonsCount = 0;
  modules.forEach((mod) => {
    mod.lessons.forEach((lsn) => {
      totalLessonsCount++;
      if (lsn.isCompleted) completedLessonsCount++;
    });
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] -m-4 sm:-m-6 lg:-m-8 bg-slate-50 dark:bg-slate-950">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle Curriculum Drawer"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <Link href="/dashboard/courses" className="hover:text-slate-200 transition-colors">
                My Learning
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <Link href={`/dashboard/courses/${courseId}`} className="hover:text-slate-200 transition-colors truncate">
                {courseTitle}
              </Link>
            </nav>
            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              {lessonTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden md:flex flex-col items-end text-xs">
            <span className="text-slate-400 font-medium">Course Progress</span>
            <span className="font-mono font-bold text-blue-400">
              {completedLessonsCount} / {totalLessonsCount} ({progressPercent}%)
            </span>
          </div>
          <Link href={`/dashboard/courses/${courseId}`}>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-200 hover:bg-slate-800">
              Course Overview
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Curriculum Sidebar */}
        <aside
          className={`fixed lg:relative inset-y-0 left-0 z-40 w-72 sm:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-500" /> Curriculum
              </span>
              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                {progressPercent}% Done
              </span>
            </div>
            <Progress value={progressPercent} size="sm" variant="primary" />

            {batchInfo && (
              <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-900/50 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-blue-950 dark:text-blue-200">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Cohort Batch
                  </span>
                  <span className="font-mono text-[10px] bg-blue-200 dark:bg-blue-900 px-1.5 py-0.5 rounded">
                    {batchInfo.code}
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 dark:text-blue-300 truncate">
                  {batchInfo.name}
                </p>
              </div>
            )}
          </div>

          {/* Module List Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
            {modules.map((mod) => (
              <div key={mod.id} className="space-y-2">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  Module {mod.order}: {mod.title}
                </h2>
                <div className="space-y-1">
                  {mod.lessons.map((item) => {
                    const isCurrent = item.id === lessonId;

                    return (
                      <div key={item.id}>
                        {item.accessGranted ? (
                          <Link
                            href={`/dashboard/courses/${courseId}/lessons/${item.id}`}
                            onClick={() => setSidebarOpen(false)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors ${
                              isCurrent
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="shrink-0">
                                {item.contentType === 'video' ? (
                                  <Video className="w-4 h-4" />
                                ) : item.contentType === 'pdf' ? (
                                  <FileText className="w-4 h-4" />
                                ) : item.contentType === 'quiz' ? (
                                  <HelpCircle className="w-4 h-4" />
                                ) : item.contentType === 'assignment' ? (
                                  <FileCheck className="w-4 h-4" />
                                ) : (
                                  <BookOpen className="w-4 h-4" />
                                )}
                              </span>
                              <span className="truncate">{item.title}</span>
                            </div>

                            {item.isCompleted && (
                              <CheckCircle2
                                className={`w-4 h-4 shrink-0 ${
                                  isCurrent ? 'text-white' : 'text-emerald-500'
                                }`}
                              />
                            )}
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between p-2.5 rounded-lg text-xs text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Lock className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </div>
                            {item.accessReason === 'drip_locked' && item.daysRemaining !== undefined && (
                              <span className="text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-500">
                                {item.daysRemaining}d
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Lesson Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Content Top Bar */}
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize text-xs">
                    {contentType.replace('_', ' ')}
                  </Badge>
                  {isPreviewFree && (
                    <Badge variant="outline" className="text-xs">
                      Free Preview
                    </Badge>
                  )}
                  {isCompleted && (
                    <Badge variant="success" className="text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {lessonTitle}
                </h2>
              </div>

              {contentType !== 'quiz' && contentType !== 'assignment' && (
                <MarkCompleteButton
                  courseId={courseId}
                  lessonId={lessonId}
                  initialCompleted={isCompleted}
                />
              )}
            </div>

            {/* Renderer Switcher */}
            <div className="p-4 sm:p-6">
              {contentType === 'video' ? (
                <div className="space-y-4">
                  <div className="aspect-video w-full bg-slate-950 rounded-xl overflow-hidden relative shadow-inner flex items-center justify-center border border-slate-800">
                    {contentData.videoReadUrl ? (
                      <video
                        src={contentData.videoReadUrl}
                        controls
                        className="w-full h-full object-contain"
                        controlsList="nodownload"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-3 text-white">
                        <div className="w-16 h-16 rounded-full bg-blue-600/30 flex items-center justify-center mx-auto text-blue-400">
                          <Video className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-lg">Protected Video Lesson</h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Video stream ready. Playback authorized for current session.
                        </p>
                      </div>
                    )}
                  </div>
                  {contentData.durationSeconds && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      Duration: {Math.floor(contentData.durationSeconds / 60)} minutes
                    </p>
                  )}
                </div>
              ) : contentType === 'pdf' ? (
                <div className="space-y-4">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        Document / PDF Learning Material
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {contentData.pdfStorageKey ? `Document reference: ${contentData.pdfStorageKey}` : 'Course reading guide'}
                      </p>
                    </div>

                    {contentData.pdfReadUrl && (
                      <a
                        href={contentData.pdfReadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <Download className="w-4 h-4" /> Open / Read PDF Viewer
                      </a>
                    )}
                  </div>
                </div>
              ) : contentType === 'rich_text' ? (
                <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-sm p-2">
                  {contentData.bodyMarkdown ? (
                    <div className="space-y-4 whitespace-pre-wrap">
                      {contentData.bodyMarkdown}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No text content published for this lesson.</p>
                  )}
                </div>
              ) : contentType === 'quiz' ? (
                <StudentQuizRunner
                  quizId={contentData.quizId || ''}
                  enrollmentId={enrollmentId}
                />
              ) : contentType === 'assignment' ? (
                <StudentAssignmentUploader
                  assignmentId={contentData.assignmentId || ''}
                  enrollmentId={enrollmentId}
                />
              ) : (
                <div className="p-6 bg-slate-50 text-center">
                  <p className="text-xs text-slate-500">Standard Lesson Content</p>
                </div>
              )}

              {/* Lesson Downloadable Resources */}
              {resources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                    Lesson Resources & Downloads ({resources.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {resources.map((res, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between text-xs border border-slate-100 dark:border-slate-800"
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {res.title}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {res.mimeType} • {(res.fileSizeBytes / 1024).toFixed(0)} KB
                          </span>
                        </div>

                        {res.downloadAllowed && res.downloadUrl ? (
                          <a
                            href={res.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors shrink-0 border border-slate-200 dark:border-slate-700"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Read-only</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Next/Prev Bar */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <div>
              {prevLesson && prevLesson.granted ? (
                <Link href={`/dashboard/courses/${courseId}/lessons/${prevLesson.id}`}>
                  <Button variant="outline" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />}>
                    Previous: {prevLesson.title}
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled leftIcon={<ChevronLeft className="w-4 h-4" />}>
                  {prevLesson ? 'Previous (Locked)' : 'Start of Course'}
                </Button>
              )}
            </div>

            <div>
              {nextLesson ? (
                nextLesson.granted ? (
                  <Link href={`/dashboard/courses/${courseId}/lessons/${nextLesson.id}`}>
                    <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                      Next: {nextLesson.title}
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" size="sm" disabled rightIcon={<Lock className="w-3.5 h-3.5" />}>
                    Next: {nextLesson.title} ({nextLesson.reason === 'drip_locked' ? `${nextLesson.daysRemaining}d` : 'Locked'})
                  </Button>
                )
              ) : (
                <Link href={`/dashboard/courses/${courseId}`}>
                  <Button variant="primary" size="sm" rightIcon={<CheckCircle2 className="w-4 h-4" />}>
                    Complete Course →
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
