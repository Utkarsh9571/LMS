import React from 'react';
import Link from 'next/link';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { BatchModel } from '@/core/domain/batch.model';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { CourseModel } from '@/core/domain/course.model';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { JoinLiveSessionButton } from '@/components/batches/join-live-session-button';
import { Calendar, Users, Clock, Video, ArrowRight, CheckCircle2 } from 'lucide-react';

export const revalidate = 0;

export default async function StudentBatchesPage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();

  const enrollments = await EnrollmentModel.find({
    userId: session.userId,
    batchId: { $ne: null },
    status: 'active'
  });

  const batchIds = enrollments.map((e) => e.batchId);
  const batches = await BatchModel.find({ _id: { $in: batchIds } });

  const courseIds = batches.map((b) => b.courseId);
  const courses = await CourseModel.find({ _id: { $in: courseIds } });
  const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));

  const now = new Date();
  const enrichedBatches = await Promise.all(
    batches.map(async (b) => {
      const course = courseMap.get(b.courseId.toString());
      const nextSession = await LiveSessionModel.findOne({
        batchId: b._id,
        status: { $in: ['scheduled', 'live'] },
        endTime: { $gt: now }
      }).sort({ startTime: 1 });

      return {
        batch: b,
        course,
        nextSession
      };
    })
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Cohort Batches & Live Classes"
        description="View your active cohort enrollments, workshop schedules, and join live online sessions."
        badge={<Badge variant="default">{enrichedBatches.length} Active Cohorts</Badge>}
      />

      {enrichedBatches.length === 0 ? (
        <EmptyState
          title="No Cohort Batches Enrolled"
          description="You are currently taking self-paced learning tracks or not enrolled in a live cohort batch."
          action={
            <Link href="/dashboard/courses">
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Go to My Courses
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enrichedBatches.map(({ batch, course, nextSession }) => (
            <Card key={batch._id.toString()} className="flex flex-col justify-between overflow-hidden border-slate-200 dark:border-slate-800">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/60 p-5 border-b border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                    {batch.code}
                  </span>
                  <Badge variant="success" className="capitalize text-xs">
                    {batch.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg text-slate-900 dark:text-white">
                  {batch.name}
                </CardTitle>
                {course && (
                  <p className="text-xs text-slate-500 font-medium">
                    Program: <span className="text-slate-700 dark:text-slate-300 font-semibold">{course.title}</span>
                  </p>
                )}
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Start Date</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {new Date(batch.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">End Date</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {new Date(batch.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                    Next Live Session
                  </span>

                  {nextSession ? (
                    <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl space-y-3 border border-blue-200 dark:border-blue-900">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-blue-600" />
                          {nextSession.title}
                        </span>
                        <Badge variant="info" className="capitalize text-[10px]">
                          {nextSession.status}
                        </Badge>
                      </div>

                      <div className="text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(nextSession.startTime).toLocaleString()} ({nextSession.durationMinutes} mins)
                        </span>
                      </div>

                      <div className="pt-1">
                        <JoinLiveSessionButton
                          sessionId={nextSession._id.toString()}
                          sessionTitle={nextSession.title}
                          isJoinable={nextSession.status === 'scheduled' || nextSession.status === 'live'}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                      No upcoming live sessions currently scheduled for this batch.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
