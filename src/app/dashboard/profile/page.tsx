import React from 'react';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/core/domain/user.model';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const revalidate = 0;

export default async function StudentProfilePage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();
  const user = await UserModel.findById(session.userId);
  if (!user) return null;

  const profile = user.toSafeProfile();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Account Profile</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          Your registered personal profile and market preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{profile.fullName}</CardTitle>
            <Badge variant="success" className="capitalize">
              {profile.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-500 block uppercase">Email Address</span>
              <span className="font-semibold text-slate-900 dark:text-white">{profile.email}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase">Phone Number</span>
              <span className="font-semibold text-slate-900 dark:text-white">{profile.phone || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase">Active Market Context</span>
              <span className="font-semibold text-slate-900 dark:text-white">{profile.lastActiveMarket} Market</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block uppercase">Global Roles</span>
              <div className="flex gap-1 mt-1">
                {profile.globalRoles.map((role) => (
                  <Badge key={role} variant="secondary" className="capitalize text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
