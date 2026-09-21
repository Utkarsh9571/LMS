import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { CourseModel } from '@/core/domain/course.model';
import { LessonModel } from '@/core/domain/lesson.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { LessonProgressModel } from '@/core/domain/lesson-progress.model';
import { AccessService } from '@/core/services/access.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarkCompleteButton } from '@/components/learning/mark-complete-button';

export const revalidate = 0;

interface LessonViewProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function StudentLessonViewPage({ params }: LessonViewProps) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login');
  }

  const { courseId, lessonId } = await params;
  await connectToDatabase();

  const course = await CourseModel.findById(courseId);
  const lesson = await LessonModel.findOne({ _id: lessonId, courseId });

  if (!course || !lesson) {
    notFound();
  }

  // Verify Access strictly via AccessService
  const accessEval = await AccessService.canAccessLesson(session.userId, lessonId);
  if (!accessEval.granted) {
    return (
      <div className="py-12 max-w-lg mx-auto text-center space-y-4">
        <Card className="p-8">
          <CardTitle className="text-xl text-slate-900 dark:text-white mb-2">
            Lesson Access Restricted
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            {accessEval.reason === 'drip_locked'
              ? `This lesson is drip locked. It will unlock in ${accessEval.daysRemaining} days.`
              : 'You do not have active entitlement or enrollment to access this lesson.'}
          </p>
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Course Overview
          </Link>
        </Card>
      </div>
    );
  }

  const enrollment = await EnrollmentModel.findOne({ userId: session.userId, courseId, status: 'active' });
  const progressRecord = enrollment
    ? await LessonProgressModel.findOne({ enrollmentId: enrollment._id, lessonId })
    : null;

  const isCompleted = Boolean(progressRecord?.isCompleted);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/dashboard/courses/${courseId}`}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← {course.title}
            </Link>
            <span className="text-slate-400">•</span>
            <Badge variant="secondary" className="capitalize text-xs">
              {lesson.contentType}
            </Badge>
            {lesson.isPreviewFree && (
              <Badge variant="outline" className="text-xs">
                Free Preview
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {lesson.title}
          </h1>
        </div>

        <div>
          <MarkCompleteButton
            courseId={courseId}
            lessonId={lessonId}
            initialCompleted={isCompleted}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {lesson.contentType === 'video' ? (
            <div className="space-y-4">
              <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center text-white">
                <div className="text-center p-6 space-y-2">
                  <span className="text-4xl">📹</span>
                  <h3 className="font-semibold text-lg">Secure Video Player</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Video content protected for enrolled student access.
                  </p>
                </div>
              </div>
            </div>
          ) : lesson.contentType === 'pdf' ? (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <span className="text-4xl">📄</span>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Document / PDF Lesson</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {lesson.contentData?.pdfStorageKey ? `Document reference: ${lesson.contentData.pdfStorageKey}` : 'Course reading material'}
              </p>
            </div>
          ) : lesson.contentType === 'rich_text' ? (
            <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-sm">
              {lesson.contentData?.bodyMarkdown || 'No text content available for this lesson.'}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-xl text-center space-y-2">
              <span className="text-4xl">📝</span>
              <h3 className="font-semibold text-lg">Assessment Lesson ({lesson.contentType})</h3>
              <p className="text-xs text-slate-500">
                This lesson contains a {lesson.contentType} requirement. Complete the assessment in the student section.
              </p>
            </div>
          )}

          {/* Lesson Resources if any */}
          {lesson.resources && lesson.resources.length > 0 && (
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Lesson Resources</h4>
              <div className="space-y-2">
                {lesson.resources.map((res, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">{res.title}</span>
                    <span className="text-slate-400 font-mono">{res.mimeType || 'Resource File'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
