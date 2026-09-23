import React from 'react';
import Link from 'next/link';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/core/domain/user.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { OrderModel } from '@/core/domain/order.model';
import { CertificateModel } from '@/core/domain/certificate.model';
import { CourseModel } from '@/core/domain/course.model';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  BookOpen,
  CreditCard,
  Award,
  PlayCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const revalidate = 0;

export default async function DashboardOverviewPage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();
  const user = await UserModel.findById(session.userId);
  if (!user) return null;

  // Query real student metrics & active enrollments
  const [enrollments, ordersCount, certificatesCount] = await Promise.all([
    EnrollmentModel.find({ userId: user._id, status: 'active' }).sort({ updatedAt: -1 }),
    OrderModel.countDocuments({ userId: user._id }),
    CertificateModel.countDocuments({ userId: user._id })
  ]);

  const courseIds = enrollments.map((e) => e.courseId);
  const courses = await CourseModel.find({ _id: { $in: courseIds } });
  const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));

  // Active course for "Continue Learning" section
  const activeEnrollment = enrollments[0];
  const activeCourse = activeEnrollment ? courseMap.get(activeEnrollment.courseId.toString()) : null;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-800">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Student Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {user.fullName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Track your Building Information Modeling progress and live workshop schedules.
          </p>
        </div>

        <Link href="/courses" className="shrink-0">
          <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Explore Catalog
          </Button>
        </Link>
      </div>

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Active Courses"
          value={enrollments.length}
          description="Enrolled learning modules"
          icon={<BookOpen className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          title="Certificates Earned"
          value={certificatesCount}
          description="Verified BIM credentials"
          icon={<Award className="w-5 h-5 text-emerald-500" />}
        />
        <StatCard
          title="Orders & Billing"
          value={ordersCount}
          description="Commercial transactions"
          icon={<CreditCard className="w-5 h-5 text-indigo-500" />}
        />
      </div>

      {/* Main Learning Hub Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Continue Learning & Enrolled Courses */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Course Resume Banner */}
          {activeEnrollment && activeCourse ? (
            <Card className="border-blue-200 dark:border-blue-900/60 shadow-xs">
              <CardHeader className="bg-blue-50/50 dark:bg-blue-950/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Continue Learning
                  </span>
                  <Badge variant="default" size="sm">
                    {activeCourse.level} Level
                  </Badge>
                </div>
                <CardTitle className="text-xl sm:text-2xl mt-1">
                  {activeCourse.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <Progress
                  value={activeEnrollment.progressPercent || 0}
                  showPercent
                  label="Overall Progress"
                  variant="primary"
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>{activeCourse.estimatedHours} Hours total duration</span>
                  </div>

                  <Link href={`/dashboard/courses/${activeCourse._id}`}>
                    <Button variant="primary" size="md" leftIcon={<PlayCircle className="w-4 h-4" />}>
                      Resume Player
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No Active Enrollments"
              description="You are not currently enrolled in any BIM learning modules. Browse our course catalog to start learning."
              action={
                <Link href="/courses">
                  <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Browse Course Catalog
                  </Button>
                </Link>
              }
            />
          )}

          {/* Enrolled Courses List */}
          {enrollments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  My Enrolled Courses ({enrollments.length})
                </h2>
                <Link
                  href="/dashboard/courses"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View All →
                </Link>
              </div>

              <div className="space-y-4">
                {enrollments.map((enr) => {
                  const crs = courseMap.get(enr.courseId.toString());
                  if (!crs) return null;

                  return (
                    <Card key={enr._id.toString()} className="hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" size="sm" className="capitalize">
                              {crs.level}
                            </Badge>
                            <span className="text-xs text-slate-400 font-medium">
                              Enrolled {new Date(enr.enrolledAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            <Link href={`/dashboard/courses/${crs._id}`} className="hover:text-blue-600 transition-colors">
                              {crs.title}
                            </Link>
                          </h3>
                          <Progress
                            value={enr.progressPercent || 0}
                            showPercent
                            size="sm"
                            className="max-w-md"
                          />
                        </div>

                        <Link href={`/dashboard/courses/${crs._id}`} className="shrink-0">
                          <Button variant="outline" size="sm">
                            Open Course
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Quick Actions & Certificates */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs font-semibold">
              <Link
                href="/dashboard/courses"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>My Enrolled Courses</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                href="/dashboard/batches"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span>Live Cohort Batches</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                href="/dashboard/certificates"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Award className="w-4 h-4 text-indigo-500" />
                  <span>Certificates & Verification</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                href="/dashboard/orders"
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span>Orders & Invoices</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
