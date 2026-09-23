import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { UserModel } from '@/core/domain/user.model';
import { connectToDatabase } from '@/lib/db';
import { StudentDashboardShell } from '@/components/layout/student-dashboard-shell';

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
    <StudentDashboardShell
      user={{
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        roles: user.globalRoles
      }}
    >
      {children}
    </StudentDashboardShell>
  );
}
