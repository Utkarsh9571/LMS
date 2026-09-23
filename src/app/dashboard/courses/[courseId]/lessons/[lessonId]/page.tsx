import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { CourseModel } from '@/core/domain/course.model';
import { ModuleModel } from '@/core/domain/module.model';
import { LessonModel } from '@/core/domain/lesson.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { BatchModel } from '@/core/domain/batch.model';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { LessonProgressModel } from '@/core/domain/lesson-progress.model';
import { AccessService } from '@/core/services/access.service';
import { StorageProviderFactory } from '@/providers/storage/storage-provider.factory';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import {
  StudentLessonPlayerShell,
  CurriculumModuleItem,
  CurriculumLessonItem
} from '@/components/learning/student-lesson-player-shell';

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

  // Server-Authoritative Access Check
  const accessEval = await AccessService.canAccessLesson(session.userId, lessonId);
  if (!accessEval.granted) {
    return (
      <div className="py-12 max-w-lg mx-auto text-center space-y-4">
        <Card className="p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl text-slate-900 dark:text-white">
            Lesson Access Restricted
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {accessEval.reason === 'drip_locked'
              ? `This lesson is drip locked. It will unlock in ${accessEval.daysRemaining} days.`
              : 'You do not have active entitlement or enrollment to access this lesson.'}
          </p>
          <Link href={`/dashboard/courses/${courseId}`}>
            <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Course Overview
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const enrollment = await EnrollmentModel.findOne({
    userId: session.userId,
    courseId,
    status: 'active'
  });

  if (!enrollment) {
    notFound();
  }

  // Fetch progress records
  const progressRecords = await LessonProgressModel.find({ enrollmentId: enrollment._id });
  const progressMap = new Map(progressRecords.map((p) => [p.lessonId.toString(), p]));

  const currentProgress = progressMap.get(lessonId);
  const isCompleted = Boolean(currentProgress?.isCompleted);

  // Storage URLs resolution via StorageProviderFactory
  const storageProvider = StorageProviderFactory.getProvider();
  let videoReadUrl: string | null = null;
  let pdfReadUrl: string | null = null;

  if (lesson.contentType === 'video' && lesson.contentData?.videoStorageKey) {
    try {
      videoReadUrl = await storageProvider.getReadUrl(lesson.contentData.videoStorageKey);
    } catch {
      // Non-fatal fallback
    }
  } else if (lesson.contentType === 'pdf' && lesson.contentData?.pdfStorageKey) {
    try {
      pdfReadUrl = await storageProvider.getReadUrl(lesson.contentData.pdfStorageKey);
    } catch {
      // Non-fatal fallback
    }
  }

  // Resolve signed download URLs for resources
  const resourcesWithUrls = await Promise.all(
    (lesson.resources || []).map(async (res) => {
      let downloadUrl: string | null = null;
      if (res.downloadAllowed && res.storageKey) {
        try {
          downloadUrl = await storageProvider.getReadUrl(res.storageKey);
        } catch {
          // Fallback
        }
      }
      return {
        title: res.title,
        storageKey: res.storageKey,
        fileSizeBytes: res.fileSizeBytes,
        mimeType: res.mimeType,
        downloadAllowed: res.downloadAllowed,
        downloadUrl
      };
    })
  );

  // Batch details if student is enrolled in a live batch
  let batchInfo = null;
  if (enrollment.batchId) {
    const batch = await BatchModel.findById(enrollment.batchId);
    if (batch) {
      const now = new Date();
      const nextSession = await LiveSessionModel.findOne({
        batchId: batch._id,
        status: { $in: ['scheduled', 'live'] },
        endTime: { $gt: now }
      }).sort({ startTime: 1 });

      batchInfo = {
        code: batch.code,
        name: batch.name,
        nextSession: nextSession
          ? {
              title: nextSession.title,
              startTime: nextSession.startTime.toISOString()
            }
          : null
      };
    }
  }

  // Build full curriculum structure for sidebar navigation
  const now = new Date();
  const modulesDocs = await ModuleModel.find({ courseId }).sort({ order: 1 });
  const moduleIds = modulesDocs.map((m) => m._id);
  const lessonsDocs = await LessonModel.find({ moduleId: { $in: moduleIds } }).sort({ order: 1 });

  const curriculumModules: CurriculumModuleItem[] = await Promise.all(
    modulesDocs.map(async (mod, idx) => {
      const modLessons = lessonsDocs.filter((l) => l.moduleId.toString() === mod._id.toString());
      const lessonItems: CurriculumLessonItem[] = await Promise.all(
        modLessons.map(async (lsn) => {
          const lsnId = lsn._id.toString();
          const evalRes = await AccessService.canAccessLesson(session.userId, lsnId, now);
          const prg = progressMap.get(lsnId);

          return {
            id: lsnId,
            title: lsn.title,
            contentType: lsn.contentType,
            isCompleted: Boolean(prg?.isCompleted),
            accessGranted: evalRes.granted,
            accessReason: evalRes.reason,
            daysRemaining: evalRes.daysRemaining
          };
        })
      );

      return {
        id: mod._id.toString(),
        title: mod.title,
        order: idx + 1,
        lessons: lessonItems
      };
    })
  );

  // Compute canonical prev / next lesson links
  const currentIndex = lessonsDocs.findIndex((l) => l._id.toString() === lessonId);
  const prevLessonDoc = currentIndex > 0 ? lessonsDocs[currentIndex - 1] : null;
  const nextLessonDoc = currentIndex >= 0 && currentIndex < lessonsDocs.length - 1 ? lessonsDocs[currentIndex + 1] : null;

  const prevEval = prevLessonDoc ? await AccessService.canAccessLesson(session.userId, prevLessonDoc._id.toString(), now) : null;
  const nextEval = nextLessonDoc ? await AccessService.canAccessLesson(session.userId, nextLessonDoc._id.toString(), now) : null;

  return (
    <StudentLessonPlayerShell
      courseId={courseId}
      courseTitle={course.title}
      lessonId={lessonId}
      lessonTitle={lesson.title}
      contentType={lesson.contentType}
      isPreviewFree={lesson.isPreviewFree}
      contentData={{
        videoStorageKey: lesson.contentData?.videoStorageKey,
        videoReadUrl,
        durationSeconds: lesson.contentData?.durationSeconds,
        pdfStorageKey: lesson.contentData?.pdfStorageKey,
        pdfReadUrl,
        bodyMarkdown: lesson.contentData?.bodyMarkdown,
        quizId: lesson.contentData?.quizId?.toString(),
        assignmentId: lesson.contentData?.assignmentId?.toString()
      }}
      resources={resourcesWithUrls}
      isCompleted={isCompleted}
      enrollmentId={enrollment._id.toString()}
      progressPercent={enrollment.progressPercent || 0}
      batchInfo={batchInfo}
      modules={curriculumModules}
      prevLesson={
        prevLessonDoc
          ? {
              id: prevLessonDoc._id.toString(),
              title: prevLessonDoc.title,
              granted: Boolean(prevEval?.granted)
            }
          : null
      }
      nextLesson={
        nextLessonDoc
          ? {
              id: nextLessonDoc._id.toString(),
              title: nextLessonDoc.title,
              granted: Boolean(nextEval?.granted),
              reason: nextEval?.reason,
              daysRemaining: nextEval?.daysRemaining
            }
          : null
      }
    />
  );
}
