'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format-currency';
import {
  Users,
  CreditCard,
  Video,
  ShoppingBag,
  Calendar,
  Plus,
  BookOpen,
  Copy,
  ExternalLink,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';

interface IDashboardData {
  metrics: {
    activeStudentsCount: number;
    totalRevenueMinorUnits: number;
    currency: string;
    activeServicesCount: number;
    isGlobalAdmin: boolean;
  };
  upcomingSessions: Array<{
    id: string;
    title: string;
    startTime: string;
    durationMinutes: number;
    status: string;
    batchId: string;
    hostUrl?: string;
    studentJoinUrl: string;
  }>;
}

export default function StaffDashboardPage() {
  const [data, setData] = useState<IDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/staff/dashboard')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error?.message || 'Failed to load staff operational metrics');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Staff Operations & Workstation"
          description="Real-time operational summary of active students, live workshops, and revenue metrics."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to Load Operations Dashboard"
        message={error || 'An unexpected error occurred while fetching operational metrics.'}
        action={
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry Loading
          </Button>
        }
      />
    );
  }

  const { metrics, upcomingSessions } = data;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Staff Operations & Workstation"
        description="Real-time operational summary of active student enrollments, live workshop sessions, and commercial sales."
        badge={
          <Badge variant="default" className="text-xs font-bold uppercase tracking-wider">
            {metrics.isGlobalAdmin ? 'Global Admin Workstation' : 'Instructor / Facilitator Workstation'}
          </Badge>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Students"
          value={metrics.activeStudentsCount}
          description="Enrolled in active learning tracks"
          icon={<Users className="w-5 h-5 text-blue-500" />}
        />

        {metrics.isGlobalAdmin && (
          <StatCard
            title="Total Revenue"
            value={formatCurrency(metrics.totalRevenueMinorUnits, metrics.currency)}
            description={`Completed ${metrics.currency} orders`}
            icon={<CreditCard className="w-5 h-5 text-emerald-500" />}
          />
        )}

        <StatCard
          title="Upcoming Workshops"
          value={upcomingSessions.length}
          description="Live sessions ready to host"
          icon={<Video className="w-5 h-5 text-indigo-500" />}
        />

        {metrics.isGlobalAdmin && (
          <StatCard
            title="Active Services"
            value={metrics.activeServicesCount}
            description="Commercial products & offers"
            icon={<ShoppingBag className="w-5 h-5 text-purple-500" />}
          />
        )}
      </div>

      {/* Quick Operational Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Quick Operational Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/staff/workshops?action=schedule">
              <Button variant="primary" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
                Schedule Live Workshop
              </Button>
            </Link>

            {metrics.isGlobalAdmin && (
              <Link href="/staff/services?action=create">
                <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Create Service / Program
                </Button>
              </Link>
            )}

            <Link href="/staff/customers">
              <Button variant="outline" size="sm" leftIcon={<Users className="w-4 h-4" />}>
                Customer Management
              </Button>
            </Link>

            <Link href="/dashboard/courses">
              <Button variant="ghost" size="sm" leftIcon={<BookOpen className="w-4 h-4" />}>
                Course Catalog Engine
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Workshops Table/List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-500" />
            Next Scheduled Live Workshops ({upcomingSessions.length})
          </CardTitle>
          <Link href="/staff/workshops" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            View All Workshops →
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {upcomingSessions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No Upcoming Workshops Scheduled"
                description="There are currently no live workshop sessions scheduled in your active market."
                action={
                  <Link href="/staff/workshops?action=schedule">
                    <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                      Schedule New Session
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="info" className="capitalize text-[10px]">
                        {session.status}
                      </Badge>
                      <span className="text-xs font-medium text-slate-500">
                        {new Date(session.startTime).toLocaleString()} ({session.durationMinutes} mins)
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {session.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {session.hostUrl ? (
                      <a href={session.hostUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="primary" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                          Host Live Session
                        </Button>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
                        Host URL Unavailable
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(session.id, session.studentJoinUrl)}
                      leftIcon={copiedId === session.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copiedId === session.id ? 'Copied Link' : 'Copy Student Link'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
