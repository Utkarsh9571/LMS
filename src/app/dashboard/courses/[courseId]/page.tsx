import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { CourseModel } from '@/core/domain/course.model';
import { ModuleModel } from '@/core/domain/module.model';
import { LessonModel } from '@/core/domain/lesson.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { LessonProgressModel } from '@/core/domain/lesson-progress.model';
import { AccessService } from '@/core/services/access.service';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import {
  BookOpen,
  Clock,
  Video,
  FileText,
  HelpCircle,
  CheckCircle2,
  Lock,
  PlayCircle,
  ArrowLeft,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export const revalidate = 0;

interface CourseOverviewProps {
  params: Promise<{ courseId: string }>;
}

export default async function StudentCourseOverviewPage({ params }: CourseOverviewProps) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login');
  }

  const { courseId } = await params;
  await connectToDatabase();

  const course = await CourseModel.findById(courseId);
  if (!course) {
    notFound();
  }

  // Server-authoritative Access Check
  const hasAccess = await AccessService.canAccessCourse(session.userId, course.id);
  const enrollment = await EnrollmentModel.findOne({
    userId: session.userId,
    courseId: course.id,
    status: 'active'
  });

  if (!hasAccess || !enrollment) {
    return (
      <div className="py-12 max-w-lg mx-auto">
        <Card className="text-center p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl">Active Enrollment Required</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You do not currently have active access or enrollment for <strong>{course.title}</strong>.
          </p>
          <Link href="/courses">
            <Button variant="primary">Browse Course Catalog</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const modules = await ModuleModel.find({ courseId: course._id }).sort({ order: 1 });
  const moduleIds = modules.map((m) => m._id);
  const lessons = await LessonModel.find({ moduleId: { $in: moduleIds } }).sort({ order: 1 });

  const progressRecords = await LessonProgressModel.find({ enrollmentId: enrollment._id });
  const progressMap = new Map(progressRecords.map((p) => [p.lessonId.toString(), p]));

  const now = new Date();

  const enrichedModules = await Promise.all(
    modules.map(async (mod, idx) => {
      const moduleLessons = lessons.filter((l) => l.moduleId.toString() === mod._id.toString());
      const lessonItems = await Promise.all(
        moduleLessons.map(async (lesson) => {
          const lessonId = lesson._id.toString();
          const accessEval = await AccessService.canAccessLesson(session.userId, lessonId, now);
          const progress = progressMap.get(lessonId);
          return {
            id: lessonId,
            title: lesson.title,
            contentType: lesson.contentType,
            accessEval,
            isCompleted: Boolean(progress?.isCompleted)
          };
        })
      );
      return {
        id: mod._id.toString(),
        title: mod.title,
        description: mod.description,
        order: idx + 1,
        lessons: lessonItems
      };
    })
  );

  // Find next uncompleted accessible lesson
  let nextLessonToResume: string | null = null;
  for (const mod of enrichedModules) {
    for (const lsn of mod.lessons) {
      if (lsn.accessEval.granted && !lsn.isCompleted) {
        nextLessonToResume = lsn.id;
        break;
      }
    }
    if (nextLessonToResume) break;
  }
  if (!nextLessonToResume && enrichedModules[0]?.lessons[0]?.id) {
    nextLessonToResume = enrichedModules[0].lessons[0].id;
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'My Courses', href: '/dashboard/courses' },
          { label: course.title }
        ]}
      />

      {/* Course Hero Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {course.level} Level
              </Badge>
              <Badge variant="success">Active Enrollment</Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {course.description}
            </p>
          </div>

          {nextLessonToResume && (
            <Link href={`/dashboard/courses/${course._id}/lessons/${nextLessonToResume}`} className="shrink-0">
              <Button size="lg" className="w-full sm:w-auto" leftIcon={<PlayCircle className="w-4 h-4" />}>
                Resume Player
              </Button>
            </Link>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Course Progress</span>
            <Progress value={enrollment.progressPercent || 0} showPercent size="sm" variant="success" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>{course.estimatedHours} Hours estimated duration</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>{lessons.length} Total Published Lessons</span>
          </div>
        </div>
      </div>

      {/* Curriculum Breakdown */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Curriculum Structure
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {enrichedModules.length} Modules
          </span>
        </div>

        {enrichedModules.length === 0 ? (
          <EmptyState
            title="No Curriculum Modules Found"
            description="The instructor has not published any modules for this course yet."
          />
        ) : (
          <div className="space-y-6">
            {enrichedModules.map((mod) => (
              <Card key={mod.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-800/60 p-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold">
                      Module {mod.order}: {mod.title}
                    </CardTitle>
                    <span className="text-xs font-medium text-slate-500">
                      {mod.lessons.length} Lessons
                    </span>
                  </div>
                  {mod.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {mod.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {mod.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                            {lesson.contentType === 'video' ? (
                              <Video className="w-4 h-4 text-blue-500" />
                            ) : lesson.contentType === 'pdf' ? (
                              <FileText className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <HelpCircle className="w-4 h-4 text-indigo-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            {lesson.accessEval.granted ? (
                              <Link
                                href={`/dashboard/courses/${course.id}/lessons/${lesson.id}`}
                                className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 transition-colors truncate block"
                              >
                                {lesson.title}
                              </Link>
                            ) : (
                              <span className="font-medium text-slate-400 dark:text-slate-500 truncate block">
                                {lesson.title}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {lesson.isCompleted && (
                            <Badge variant="success" size="sm" className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </Badge>
                          )}

                          {lesson.accessEval.granted ? (
                            <Link href={`/dashboard/courses/${course.id}/lessons/${lesson.id}`}>
                              <Button
                                variant={lesson.isCompleted ? 'outline' : 'primary'}
                                size="sm"
                                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                              >
                                {lesson.isCompleted ? 'Review' : 'Start'}
                              </Button>
                            </Link>
                          ) : lesson.accessEval.reason === 'drip_locked' ? (
                            <Badge variant="warning" size="sm" className="flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Unlocks in {lesson.accessEval.daysRemaining} days
                            </Badge>
                          ) : (
                            <Badge variant="secondary" size="sm" className="flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
