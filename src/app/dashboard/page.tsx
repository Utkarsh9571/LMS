import React from 'react';
import Link from 'next/link';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/core/domain/user.model';
import { EnrollmentModel } from '@/core/domain/enrollment.model';
import { OrderModel } from '@/core/domain/order.model';
import { CertificateModel } from '@/core/domain/certificate.model';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const revalidate = 0;

export default async function DashboardOverviewPage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();
  const user = await UserModel.findById(session.userId);
  if (!user) return null;

  const [enrolledCount, ordersCount, certificatesCount] = await Promise.all([
    EnrollmentModel.countDocuments({ userId: user._id }),
    OrderModel.countDocuments({ userId: user._id }),
    CertificateModel.countDocuments({ userId: user._id }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Welcome back, {user.fullName}!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          Manage your course enrollments, active learning progress, and orders.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Enrolled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{enrolledCount}</p>
            <Link href="/dashboard/courses" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
              View My Courses →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Orders & Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{ordersCount}</p>
            <Link href="/dashboard/orders" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
              View Orders →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Certificates Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{certificatesCount}</p>
            <Link href="/dashboard/certificates" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
              View Certificates →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
