'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  Video, 
  Copy, 
  Check, 
  Plus, 
  Search, 
  ExternalLink, 
  UserCheck, 
  Sparkles,
  BookOpen,
  Layers,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';

interface IWorkshop {
  id: string;
  batchId: string;
  courseId: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  meetingProvider: string;
  providerMeetingId: string;
  hostUrl?: string;
  studentJoinUrl: string;
  recordingStatus: string;
  recordingUrl?: string | null;
  programTitle: string;
  batchName: string;
  batchCode: string;
  batchCapacity: number;
  enrolledCount: number;
  attendeeCount: number;
}

interface IBatchOption {
  id: string;
  name: string;
  code: string;
  courseId: string;
}

export default function StaffWorkshopsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [workshops, setWorkshops] = useState<IWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scheduling Modal State
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [batches, setBatches] = useState<IBatchOption[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    batchId: '',
    title: '',
    description: '',
    startTime: '',
    durationMinutes: 60
  });

  useEffect(() => {
    if (searchParams.get('action') === 'schedule') {
      setIsScheduleOpen(true);
    }
  }, [searchParams]);

  const fetchWorkshops = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/v1/staff/workshops?status=${tab}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setWorkshops(res.data);
        } else {
          setError(res.error?.message || 'Failed to load workshops.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkshops();
  }, [tab]);

  // Fetch available batches when scheduling modal opens
  useEffect(() => {
    if (isScheduleOpen && batches.length === 0) {
      fetch('/api/v1/batches')
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            setBatches(res.data.map((b: any) => ({ id: b.id, name: b.name, code: b.code, courseId: b.courseId })));
            if (res.data.length > 0) {
              setScheduleForm((prev) => ({ ...prev, batchId: res.data[0].id }));
            }
          }
        });
    }
  }, [isScheduleOpen]);

  const handleCopyLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError(null);
    if (!scheduleForm.batchId || !scheduleForm.title || !scheduleForm.startTime) {
      setScheduleError('Please fill in all required fields.');
      return;
    }

    setScheduleLoading(true);
    try {
      const res = await fetch(`/api/v1/batches/${scheduleForm.batchId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: scheduleForm.title,
          description: scheduleForm.description,
          startTime: new Date(scheduleForm.startTime).toISOString(),
          durationMinutes: Number(scheduleForm.durationMinutes)
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsScheduleOpen(false);
        setScheduleForm({ batchId: '', title: '', description: '', startTime: '', durationMinutes: 60 });
        fetchWorkshops();
      } else {
        setScheduleError(data.error?.message || 'Failed to schedule workshop.');
      }
    } catch (err: any) {
      setScheduleError(err.message);
    } finally {
      setScheduleLoading(false);
    }
  };

  const filteredWorkshops = workshops.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.title.toLowerCase().includes(q) ||
      w.batchName.toLowerCase().includes(q) ||
      w.batchCode.toLowerCase().includes(q) ||
      w.programTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Workshops & Live Sessions"
        description="Operational dashboard for cohort live sessions, instructor host launching, student links, and attendance tracking."
      >
        <Button
          onClick={() => setIsScheduleOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Workshop</span>
        </Button>
      </PageHeader>

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: 'upcoming', label: 'Upcoming & Live' },
            { id: 'completed', label: 'Completed History' }
          ]}
          activeTab={tab}
          onChange={(id) => setTab(id as 'upcoming' | 'completed')}
        />

        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by title, batch, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState
          title="Workshops Load Error"
          message={error}
          action={
            <Button size="sm" variant="outline" onClick={fetchWorkshops}>
              Retry Load
            </Button>
          }
        />
      ) : filteredWorkshops.length === 0 ? (
        <EmptyState
          title={`No ${tab} workshops found`}
          description={
            searchQuery
              ? 'No workshops match your current search query.'
              : `There are currently no ${tab} live workshop sessions registered for your accessible batches.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredWorkshops.map((w) => {
            const remainingSeats = Math.max(0, w.batchCapacity - w.enrolledCount);
            return (
              <Card
                key={w.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        w.status === 'live'
                          ? 'destructive'
                          : w.status === 'scheduled'
                          ? 'default'
                          : 'secondary'
                      }
                      className={w.status === 'live' ? 'animate-pulse' : ''}
                    >
                      {w.status === 'live' ? '🔴 LIVE NOW' : w.status.toUpperCase()}
                    </Badge>

                    <Badge variant="outline" className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-blue-500" />
                      <span>{w.programTitle}</span>
                    </Badge>

                    <Badge variant="outline" className="flex items-center gap-1 font-mono">
                      <Layers className="w-3 h-3 text-indigo-500" />
                      <span>{w.batchName} ({w.batchCode})</span>
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {w.title}
                    </h3>
                    {w.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
                        {w.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1 flex-wrap font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(w.startTime).toLocaleString('en-SG', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Asia/Singapore'
                      })}{' '}
                      (SGT)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {w.durationMinutes} mins
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Cohort: <strong className="text-slate-700 dark:text-slate-300">{w.enrolledCount} / {w.batchCapacity}</strong> ({remainingSeats} left)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Attended: <strong className="text-slate-700 dark:text-slate-300">{w.attendeeCount}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Video className="w-3.5 h-3.5 text-indigo-500" />
                      {w.meetingProvider.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Staff Operations Action Toolbar */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800">
                  {w.hostUrl ? (
                    <a
                      href={w.hostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg text-center shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Launch as Host</span>
                    </a>
                  ) : (
                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 rounded text-[11px] text-slate-400 italic text-center">
                      Host URL restricted
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => handleCopyLink(w.id, w.studentJoinUrl)}
                    className="text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    {copiedId === w.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied Student Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Student Link</span>
                      </>
                    )}
                  </Button>

                  <Link
                    href={`/staff/workshops/${w.id}/attendance`}
                    className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg transition-colors text-center border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Attendance Roster →</span>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule Workshop Dialog Modal */}
      <Dialog
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Cohort Workshop"
        description="Create a live session occurrence for an active cohort batch. Host URLs will be authorized based on assigned staff roles."
      >
        {scheduleError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{scheduleError}</span>
          </div>
        )}

        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Cohort Batch *
            </label>
            {batches.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No active batches available. Please create a batch first.
              </p>
            ) : (
              <Select
                value={scheduleForm.batchId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, batchId: e.target.value })}
                options={batches.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.code})`
                }))}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Workshop Session Title *
            </label>
            <Input
              type="text"
              value={scheduleForm.title}
              onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
              placeholder="e.g. Masterclass 1: BIM & Revit Architecture Workflow"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Session Description / Agenda
            </label>
            <Input
              type="text"
              value={scheduleForm.description}
              onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
              placeholder="Operational notes or session outline"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date & Time (Local) *
              </label>
              <Input
                type="datetime-local"
                value={scheduleForm.startTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Minutes) *
              </label>
              <Input
                type="number"
                min={15}
                value={scheduleForm.durationMinutes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsScheduleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={scheduleLoading || batches.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {scheduleLoading ? 'Scheduling...' : 'Save & Schedule Workshop'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

