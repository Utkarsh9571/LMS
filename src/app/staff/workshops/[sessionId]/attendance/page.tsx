'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserCheck, 
  Percent, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle 
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface IAttendanceRosterItem {
  userId: string;
  fullName: string;
  email: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  joinedAt: string | null;
  lastSeenAt: string | null;
  joinCount: number;
}

interface IAttendanceWorkspace {
  session: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    batchId: string;
    courseId: string;
  };
  batch: {
    id: string;
    name: string;
    primaryInstructorId: string;
  };
  summary: {
    totalEnrolled: number;
    totalAttended: number;
    attendancePercentage: number;
  };
  roster: IAttendanceRosterItem[];
}

export default function WorkshopAttendancePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [data, setData] = useState<IAttendanceWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const fetchWorkspace = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/v1/staff/workshops/${sessionId}/attendance`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error?.message || 'Failed to load attendance roster.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkspace();
  }, [sessionId]);

  const handleStatusOverride = (targetUserId: string, newStatus: string) => {
    setUpdatingUser(targetUserId);
    fetch(`/api/v1/staff/workshops/${sessionId}/attendance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, status: newStatus }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          fetchWorkspace();
        } else {
          alert(res.error?.message || 'Failed to update attendance status.');
        }
      })
      .catch((err) => alert(err.message))
      .finally(() => setUpdatingUser(null));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Attendance Roster Load Error"
        message={error || 'Session attendance workspace unavailable.'}
        action={
          <Button size="sm" variant="outline" onClick={fetchWorkspace}>
            Retry Load
          </Button>
        }
      />
    );
  }

  const { session, batch, summary, roster } = data;

  return (
    <div className="space-y-6">
      {/* Back Link & Page Header */}
      <div>
        <Link
          href="/staff/workshops"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workshops</span>
        </Link>
        
        <PageHeader
          title={session.title}
          description={`Cohort Batch: ${batch.name} • ${new Date(session.startTime).toLocaleString('en-SG', {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: 'Asia/Singapore'
          })} (SGT)`}
        >
          <Badge
            variant={session.status === 'completed' ? 'success' : 'default'}
            className="text-xs font-bold uppercase"
          >
            Session: {session.status}
          </Badge>
        </PageHeader>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Cohort Students"
          value={summary.totalEnrolled}
          icon={<Users className="w-5 h-5" />}
          description="Enrolled in this cohort batch"
        />
        <StatCard
          title="Attended Students"
          value={summary.totalAttended}
          icon={<UserCheck className="w-5 h-5" />}
          description="Logged present or late"
        />
        <StatCard
          title="Attendance Rate"
          value={`${summary.attendancePercentage}%`}
          icon={<Percent className="w-5 h-5" />}
          description="Session turnout percentage"
        />
      </div>

      {/* Attendance Roster Table */}
      <Card className="p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Student Attendance Roster ({roster.length})
          </h2>
        </div>

        {roster.length === 0 ? (
          <EmptyState
            title="No Enrolled Students"
            description="There are currently no active students enrolled in this cohort batch."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Attendance Status</TableHead>
                <TableHead>First Joined</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Join Count</TableHead>
                <TableHead className="text-right">Manual Override</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{r.fullName}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === 'present'
                          ? 'success'
                          : r.status === 'late'
                          ? 'warning'
                          : r.status === 'excused'
                          ? 'info'
                          : 'destructive'
                      }
                      className="uppercase font-bold"
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {r.joinedAt ? new Date(r.joinedAt).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore' }) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {r.lastSeenAt ? new Date(r.lastSeenAt).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore' }) : '—'}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900 dark:text-white">
                    {r.joinCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      disabled={updatingUser === r.userId}
                      value={r.status}
                      onChange={(e) => handleStatusOverride(r.userId, e.target.value)}
                      options={[
                        { value: 'present', label: 'Present' },
                        { value: 'late', label: 'Late' },
                        { value: 'absent', label: 'Absent' },
                        { value: 'excused', label: 'Excused' }
                      ]}
                      className="w-32 text-xs py-1"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

