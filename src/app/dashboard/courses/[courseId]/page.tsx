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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const revalidate = 0;

interface CoursePlayerProps {
  params: Promise<{ courseId: string }>;
}

export default async function StudentCoursePlayerPage({ params }: CoursePlayerProps) {
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

  // Verify Active Entitlement & Active Enrollment for Course
  const hasAccess = await AccessService.canAccessCourse(session.userId, course.id);
  const enrollment = await EnrollmentModel.findOne({
    userId: session.userId,
    courseId: course.id,
    status: 'active',
  });

  if (!hasAccess || !enrollment) {
    return (
      <div className="py-12">
        <Card className="max-w-md mx-auto text-center p-8">
          <CardTitle className="text-xl text-slate-900 dark:text-white mb-2">
            Access Denied
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            You do not have an active enrollment or entitlement for <strong>{course.title}</strong>.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Explore Course Catalog
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
            isCompleted: Boolean(progress?.isCompleted),
          };
        })
      );
      return {
        id: mod._id.toString(),
        title: mod.title,
        description: mod.description,
        order: idx + 1,
        lessons: lessonItems,
      };
    })
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/courses" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              ← My Courses
            </Link>
            <span className="text-slate-400">•</span>
            <Badge variant="secondary" className="capitalize">
              {course.level}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{course.title}</h1>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>Overall Progress: <strong className="text-blue-600 dark:text-blue-400">{enrollment.progressPercent}%</strong></p>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Course Curriculum</h2>
        {enrichedModules.length === 0 ? (
          <p className="text-slate-500 italic text-sm">No modules published yet for this course.</p>
        ) : (
          <div className="space-y-6">
            {enrichedModules.map((mod) => (
              <Card key={mod.id}>
                <CardHeader className="p-4 bg-slate-50 dark:bg-slate-800/40">
                  <CardTitle className="text-base font-semibold">
                    Module {mod.order}: {mod.title}
                  </CardTitle>
                  {mod.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {mod.lessons.map((lesson) => (
                      <div key={lesson.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-base">
                            {lesson.contentType === 'video' ? '📹' : lesson.contentType === 'pdf' ? '📄' : '📝'}
                          </span>
                          <div>
                            {lesson.accessEval.granted ? (
                              <Link
                                href={`/dashboard/courses/${course.id}/lessons/${lesson.id}`}
                                className="font-medium text-slate-900 dark:text-white hover:text-blue-600 transition-colors"
                              >
                                {lesson.title}
                              </Link>
                            ) : (
                              <span className="font-medium text-slate-400 dark:text-slate-500">
                                {lesson.title}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {lesson.isCompleted && (
                            <Badge variant="success" className="text-xs">
                              ✓ Completed
                            </Badge>
                          )}

                          {lesson.accessEval.granted ? (
                            <Link
                              href={`/dashboard/courses/${course.id}/lessons/${lesson.id}`}
                              className="inline-flex items-center px-3 py-1 rounded text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                              {lesson.isCompleted ? 'Review Lesson' : 'Start Lesson'}
                            </Link>
                          ) : lesson.accessEval.reason === 'drip_locked' ? (
                            <Badge variant="warning" className="text-xs">
                              🔒 Drip Locked (Unlocks in {lesson.accessEval.daysRemaining} days)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-slate-400">
                              🔒 Locked
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
