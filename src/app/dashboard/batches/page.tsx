import React from 'react';
import Link from 'next/link';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { BatchModel } from '@/core/domain/batch.model';
import { LiveSessionModel } from '@/core/domain/live-session.model';
import { CourseModel } from '@/core/domain/course.model';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const revalidate = 0;

export default async function StudentBatchesPage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();

  const enrollments = await EnrollmentModel.find({
    userId: session.userId,
    batchId: { $ne: null },
    status: 'active',
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
        endTime: { $gt: now },
      }).sort({ startTime: 1 });

      return {
        batch: b,
        course,
        nextSession,
      };
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">My Batches & Live Classes</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          View your cohort batch enrollments and join upcoming live sessions.
        </p>
      </div>

      {enrichedBatches.length === 0 ? (
        <Card className="max-w-md mx-auto text-center p-8">
          <CardTitle className="text-lg mb-2">No Cohort Batches Enrolled</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            You are currently in self-paced tracks or not enrolled in live cohort batches.
          </p>
          <Link href="/dashboard/courses" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md">
            Go to My Courses
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enrichedBatches.map(({ batch, course, nextSession }) => (
            <Card key={batch._id.toString()} className="flex flex-col justify-between">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {batch.code}
                  </span>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {batch.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg text-slate-900 dark:text-white">{batch.name}</CardTitle>
                <p className="text-xs text-slate-500">{course?.title}</p>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                  <p>Start Date: {new Date(batch.startDate).toLocaleDateString()}</p>
                  <p>End Date: {new Date(batch.endDate).toLocaleDateString()}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Next Live Session
                  </span>
                  {nextSession ? (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg space-y-2 border border-blue-100 dark:border-blue-900">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-900 dark:text-blue-200">
                          {nextSession.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {nextSession.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">
                        {new Date(nextSession.startTime).toLocaleString()} ({nextSession.durationMinutes} mins)
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No upcoming live sessions scheduled.</p>
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
