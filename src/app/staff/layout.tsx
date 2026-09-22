import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { UserModel } from '@/core/domain/user.model';
import { connectToDatabase } from '@/lib/db';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login?redirect=/staff');
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.userId);
  if (!user) {
    redirect('/login');
  }

  // Authoritative server-side role check
  const isStaffAuthorized = user.globalRoles.some((role) =>
    ['superadmin', 'admin', 'instructor', 'staff'].includes(role)
  );

  if (!isStaffAuthorized) {
    redirect('/dashboard'); // Students redirected to student dashboard
  }

  const isGlobalAdmin = user.globalRoles.some((role) =>
    ['superadmin', 'admin'].includes(role)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row transition-colors">
      {/* Staff Operational Shell Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/staff" className="font-bold text-xl flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                LMS Operations
              </span>
            </Link>
          </div>

          <nav className="space-y-1">
            <Link
              href="/staff"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              📊 Dashboard
            </Link>
            <Link
              href="/staff/analytics"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              📈 Operational Analytics
            </Link>
            <Link
              href="/staff/batches"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              👥 Batches & Cohorts
            </Link>
            <Link
              href="/staff/workshops"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              🗓️ Workshops
            </Link>
            <Link
              href="/staff/messages"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ✉️ Operational Messages
            </Link>
            {isGlobalAdmin && (
              <>
                <Link
                  href="/staff/services"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  🛍️ Services & Programs
                </Link>
                <Link
                  href="/staff/customers"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  👥 Customers & Students
                </Link>
                <Link
                  href="/staff/sales"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  💳 Sales & Orders
                </Link>
              </>
            )}
            {isGlobalAdmin && (
              <Link
                href="/staff/courses"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                📚 Courses & Curriculum
              </Link>
            )}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <Link
            href="/dashboard"
            className="block text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Switch to Student View
          </Link>
          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-col truncate max-w-[140px]">
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                {user.fullName}
              </span>
              <span className="text-[10px] text-slate-500 capitalize truncate">
                {user.globalRoles.join(', ')}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Staff Workstation */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
