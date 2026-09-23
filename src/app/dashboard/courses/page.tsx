import React from 'react';
import Link from 'next/link';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { CourseModel } from '@/core/domain/course.model';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { BookOpen, Clock, PlayCircle, ArrowRight, Layers, CheckCircle2 } from 'lucide-react';

export const revalidate = 0;

export default async function StudentCoursesPage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();
  const enrollments = await EnrollmentModel.find({ userId: session.userId, status: 'active' }).sort({ updatedAt: -1 });

  const courseIds = enrollments.map((e) => e.courseId);
  const courses = await CourseModel.find({ _id: { $in: courseIds } });
  const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Learning Library"
        description="Access your active BIM training modules, track completion progress, and resume learning."
        badge={<Badge variant="default">{enrollments.length} Active Courses</Badge>}
      />

      {enrollments.length === 0 ? (
        <EmptyState
          title="No Active Course Enrollments"
          description="You have not enrolled in any BIM learning tracks yet. Browse our course catalog to get started."
          action={
            <Link href="/courses">
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Browse Course Catalog
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => {
            const course = courseMap.get(enrollment.courseId.toString());
            if (!course) return null;

            const isCompleted = enrollment.progressPercent === 100;

            return (
              <Card key={enrollment._id.toString()} className="flex flex-col justify-between hover:border-blue-500/50 transition-all shadow-xs">
                <div>
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-semibold gap-2">
                        <Layers className="w-8 h-8" />
                        <span className="text-xs">BIM Academy Course</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      <Badge variant="secondary" className="capitalize">
                        {course.level}
                      </Badge>
                      {isCompleted && (
                        <Badge variant="success" className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardHeader className="space-y-2">
                    <CardTitle className="text-lg line-clamp-2">
                      <Link href={`/dashboard/courses/${course._id}`} className="hover:text-blue-600 transition-colors">
                        {course.title}
                      </Link>
                    </CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {course.description}
                    </p>
                  </CardHeader>
                </div>

                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <Progress
                      value={enrollment.progressPercent || 0}
                      showPercent
                      label="Learning Progress"
                      variant={isCompleted ? 'success' : 'primary'}
                      size="sm"
                    />

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-medium">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>{course.estimatedHours} Hours total</span>
                      </div>
                      <span>Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Link href={`/dashboard/courses/${course._id}`} className="block">
                    <Button
                      variant={isCompleted ? 'outline' : 'primary'}
                      className="w-full"
                      leftIcon={<PlayCircle className="w-4 h-4" />}
                    >
                      {isCompleted ? 'Review Course' : 'Continue Learning'}
                    </Button>
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
