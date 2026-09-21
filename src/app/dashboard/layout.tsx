import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { UserModel } from '@/core/domain/user.model';
import { connectToDatabase } from '@/lib/db';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login?redirect=/dashboard');
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.userId);
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row transition-colors">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="font-bold text-xl flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">LMS</span>
              <span className="text-slate-900 dark:text-white">Dashboard</span>
            </Link>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard/courses"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              📚 My Courses
            </Link>
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              💳 Orders & Billing
            </Link>
            <Link
              href="/dashboard/certificates"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              📜 Certificates
            </Link>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              👤 Profile
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <Link
            href="/courses"
            className="block text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Public Catalog
          </Link>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500 truncate max-w-[120px]">
              {user.email}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
