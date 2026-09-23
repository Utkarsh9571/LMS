import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { UserModel } from '@/core/domain/user.model';
import { connectToDatabase } from '@/lib/db';
import { StaffDashboardShell } from '@/components/layout/staff-dashboard-shell';

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

  return (
    <StaffDashboardShell
      user={{
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        roles: user.globalRoles,
        marketCode: user.lastActiveMarket || 'SG'
      }}
    >
      {children}
    </StaffDashboardShell>
  );
}
