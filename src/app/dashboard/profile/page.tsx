import React from 'react';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { UserModel } from '@/core/domain/user.model';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { User, Mail, Phone, Globe, Shield, Moon, Sun } from 'lucide-react';

export const revalidate = 0;

export default async function StudentProfilePage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();
  const user = await UserModel.findById(session.userId);
  if (!user) return null;

  const profile = user.toSafeProfile();

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Profile & Account Settings"
        description="View your registered personal details, market preferences, and system authorization roles."
        badge={
          <Badge variant="success" className="capitalize">
            {profile.status} Status
          </Badge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left 2 Cols: Personal Details Form (Read-only presentation) */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.fullName}
                  readOnly
                  disabled
                  leftIcon={<User className="w-4 h-4" />}
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={profile.email}
                  readOnly
                  disabled
                  leftIcon={<Mail className="w-4 h-4" />}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone || 'Not provided'}
                  readOnly
                  disabled
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account & Market Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Context & Region</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span>Active Market Context</span>
                  </div>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white">
                    {profile.lastActiveMarket} Market
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    <span>Global Authorization</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {profile.globalRoles.map((role) => (
                      <Badge key={role} variant="secondary" className="capitalize">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Theme Preference */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interface Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-slate-600 dark:text-slate-400">
              <p>
                Customize your visual viewing preference. Switch between Light and Dark mode appearance.
              </p>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-900 dark:text-white">Theme Mode</span>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
