import React from 'react';
import Link from 'next/link';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { CourseModel } from '@/core/domain/course.model';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const revalidate = 0;

export default async function StudentCoursesPage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();
  const enrollments = await EnrollmentModel.find({ userId: session.userId, status: 'active' }).sort({ createdAt: -1 });

  const courseIds = enrollments.map((e) => e.courseId);
  const courses = await CourseModel.find({ _id: { $in: courseIds } });
  const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">My Enrolled Courses</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          Access your active BIM learning tracks and course content.
        </p>
      </div>

      {enrollments.length === 0 ? (
        <Card className="max-w-md mx-auto text-center p-8">
          <CardTitle className="text-lg mb-2">No Active Enrollments</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            You are not currently enrolled in any courses. Browse our course catalog to get started.
          </p>
          <Link href="/courses" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md">
            Browse Courses
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => {
            const course = courseMap.get(enrollment.courseId.toString());
            if (!course) return null;

            return (
              <Card key={enrollment._id.toString()} className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="capitalize">
                      {course.level}
                    </Badge>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Active Access
                    </span>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                      <span>Course Progress</span>
                      <span>{enrollment.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${enrollment.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/courses/${course._id}`}
                    className="block w-full text-center py-2.5 px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Continue Learning
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
