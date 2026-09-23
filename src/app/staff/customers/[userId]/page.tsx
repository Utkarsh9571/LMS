'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format-currency';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  BookOpen,
  CreditCard,
  Award,
  Key,
  Plus,
  Trash2,
  ExternalLink,
  ChevronLeft,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ICustomer360 {
  profile: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
    globalRoles: string[];
    status: string;
    createdAt: string;
  };
  enrollments: Array<{
    id: string;
    courseId: string;
    courseTitle: string;
    batchName?: string | null;
    status: string;
    progressPercent: number;
    enrolledAt: string;
  }>;
  purchases: Array<{
    id: string;
    orderNumber: string;
    productTitle: string;
    marketCode: string;
    currency: string;
    totalMinorUnits: number;
    status: string;
    createdAt: string;
  }>;
  certificates: Array<{
    id: string;
    certificateNumber: string;
    issuedAt: string;
    isRevoked: boolean;
  }>;
  entitlements: Array<{
    id: string;
    targetType: string;
    targetId: string;
    status: string;
    grantedAt: string;
  }>;
}

interface ICourseOption {
  id: string;
  title: string;
  deliveryModes: string[];
}

interface IBatchOption {
  id: string;
  name: string;
  courseId: string;
  enrolledCount: number;
  capacity: number;
}

export default function StaffCustomerDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const [data, setData] = useState<ICustomer360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Grant Modal & Form State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [courses, setCourses] = useState<ICourseOption[]>([]);
  const [batches, setBatches] = useState<IBatchOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<'SG' | 'MY'>('SG');
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [grantFeedback, setGrantFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Revoke Action State
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadCustomerData = () => {
    setLoading(true);
    fetch(`/api/v1/staff/customers/${userId}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error?.message || 'Failed to load customer profile');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomerData();
  }, [userId]);

  const openGrantModal = () => {
    setShowGrantModal(true);
    setGrantFeedback(null);
    if (courses.length === 0) {
      setOptionsLoading(true);
      fetch('/api/v1/staff/messages/options')
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            fetch('/api/v1/courses')
              .then((cRes) => cRes.json())
              .then((cData) => {
                if (cData.success) {
                  setCourses(cData.data || []);
                }
              });
            fetch('/api/v1/batches')
              .then((bRes) => bRes.json())
              .then((bData) => {
                if (bData.success) {
                  setBatches(bData.data || []);
                }
              });
          }
        })
        .catch(() => {})
        .finally(() => setOptionsLoading(false));
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      setGrantFeedback({ type: 'error', message: 'Please select a course to grant.' });
      return;
    }

    setGrantSubmitting(true);
    setGrantFeedback(null);

    try {
      const res = await fetch(`/api/v1/staff/customers/${userId}/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          batchId: selectedBatchId || null,
          marketCode: selectedMarket
        })
      });
      const result = await res.json();

      if (result.success) {
        const isAlready = result.data.status === 'already_granted';
        setGrantFeedback({
          type: 'success',
          message: isAlready
            ? 'Customer already possesses an active access grant for this course/batch.'
            : 'Manual entitlement and course enrollment granted successfully!'
        });
        setTimeout(() => {
          setShowGrantModal(false);
          setSelectedCourseId('');
          setSelectedBatchId('');
          loadCustomerData();
        }, 1500);
      } else {
        setGrantFeedback({
          type: 'error',
          message: result.error?.message || 'Failed to grant manual access.'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error.';
      setGrantFeedback({ type: 'error', message: msg });
    } finally {
      setGrantSubmitting(false);
    }
  };

  const handleRevokeAccess = async (entitlementId: string) => {
    if (!confirm('Are you sure you want to revoke this entitlement? Access will be revoked and enrollment status updated to dropped.')) {
      return;
    }

    setRevokingId(entitlementId);
    try {
      const res = await fetch(`/api/v1/staff/customers/${userId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entitlementId })
      });
      const result = await res.json();

      if (result.success) {
        loadCustomerData();
      } else {
        alert(result.error?.message || 'Failed to revoke access.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error.';
      alert(msg);
    } finally {
      setRevokingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 md:col-span-2 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Customer 360 Error"
        message={error || 'Customer profile not found.'}
        action={
          <Link href="/staff/customers">
            <Button variant="outline" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />}>
              Return to Customer Directory
            </Button>
          </Link>
        }
      />
    );
  }

  const { profile, enrollments, purchases, certificates, entitlements } = data;
  const filteredBatches = batches.filter((b) => b.courseId === selectedCourseId);

  return (
    <div className="space-y-8">
      {/* Back Link & Header */}
      <div className="space-y-4">
        <Link href="/staff/customers">
          <Button variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />}>
            Back to Customer Directory
          </Button>
        </Link>

        <PageHeader
          title={profile.fullName}
          description={`Customer 360 Workspace • ID: ${profile.id}`}
          badge={
            <div className="flex items-center gap-2">
              <Badge variant={profile.status === 'active' ? 'success' : 'destructive'} className="capitalize text-xs">
                Account: {profile.status}
              </Badge>
              <Button variant="primary" size="sm" onClick={openGrantModal} leftIcon={<Plus className="w-4 h-4" />}>
                Grant Manual Access
              </Button>
            </div>
          }
        />
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Enrollments"
          value={enrollments.filter((e) => e.status === 'active').length}
          description="Enrolled learning tracks"
          icon={<BookOpen className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          title="Total Orders"
          value={purchases.length}
          description="Commerce purchase history"
          icon={<CreditCard className="w-5 h-5 text-emerald-500" />}
        />
        <StatCard
          title="Active Entitlements"
          value={entitlements.filter((e) => e.status === 'active').length}
          description="Granted access rights"
          icon={<Key className="w-5 h-5 text-indigo-500" />}
        />
        <StatCard
          title="Certificates Issued"
          value={certificates.length}
          description="Verified credentials"
          icon={<Award className="w-5 h-5 text-purple-500" />}
        />
      </div>

      {/* Profile Details & Enrollments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Email Address</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{profile.email}</span>
            </div>
            {profile.phone && (
              <div>
                <span className="text-slate-400 block font-medium">Phone Number</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{profile.phone}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 block font-medium">Global Authorization Roles</span>
              <div className="flex gap-1 mt-1 flex-wrap">
                {profile.globalRoles.map((r) => (
                  <Badge key={r} variant="secondary" className="capitalize text-[10px]">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Registered Date</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {new Date(profile.createdAt).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Enrollments List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              Course Enrollments ({enrollments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {enrollments.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No Course Enrollments"
                  description="This customer does not currently hold any active or past course enrollments."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {enrollments.map((e) => (
                  <div key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{e.courseTitle}</p>
                      {e.batchName && (
                        <span className="font-semibold text-blue-600 dark:text-blue-400 block">
                          Cohort Batch: {e.batchName}
                        </span>
                      )}
                      <span className="text-slate-400 block">
                        Enrolled On: {new Date(e.enrolledAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="sm:text-right shrink-0 space-y-1">
                      <Badge variant={e.status === 'active' ? 'success' : 'secondary'} className="capitalize text-[10px]">
                        {e.status}
                      </Badge>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        Progress: {e.progressPercent}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders History Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-500" />
            Purchase & Orders History ({purchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {purchases.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No Purchases Recorded"
                description="This customer has not completed any commercial order transactions."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Order Number</th>
                    <th className="p-3">Product / Offer</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Market</th>
                    <th className="p-3">Order Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{p.orderNumber}</td>
                      <td className="p-3 font-semibold">{p.productTitle}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(p.totalMinorUnits, p.currency)}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="uppercase font-bold text-[10px]">
                          {p.marketCode}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={p.status === 'paid' ? 'success' : 'secondary'} className="capitalize text-[10px]">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Link href={`/staff/sales/${p.orderNumber}`}>
                          <Button variant="outline" size="sm">
                            Order Detail →
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entitlements & Certificates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Entitlements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-500" />
              Granted Entitlements ({entitlements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {entitlements.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No Active Entitlements" description="No entitlement records exist for this user." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {entitlements.map((ent) => (
                  <div key={ent.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white uppercase">
                        {ent.targetType}: {ent.targetId}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Granted: {new Date(ent.grantedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={ent.status === 'active' ? 'success' : 'destructive'} className="capitalize text-[10px]">
                        {ent.status}
                      </Badge>
                      {ent.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revokingId === ent.id}
                          onClick={() => handleRevokeAccess(ent.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                        >
                          {revokingId === ent.id ? 'Revoking...' : 'Revoke Access'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-500" />
              Issued Certificates ({certificates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {certificates.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No Certificates Issued" description="No course completion certificates issued yet." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {certificates.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{c.certificateNumber}</span>
                      <p className="text-[10px] text-slate-400">Issued: {new Date(c.issuedAt).toLocaleDateString()}</p>
                    </div>
                    <a href={`/verify/${c.certificateNumber}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                        Verify Online
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grant Access Dialog */}
      <Dialog
        isOpen={showGrantModal}
        onClose={() => setShowGrantModal(false)}
        title="Manual Access Provisioning"
        description="Administrative access provisioning without monetary checkout"
        maxWidth="lg"
      >
        {grantFeedback && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold mb-4 ${
              grantFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200'
                : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200 border border-red-200'
            }`}
          >
            {grantFeedback.message}
          </div>
        )}

        {optionsLoading ? (
          <div className="p-6 text-center space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (
          <form onSubmit={handleGrantAccess} className="space-y-4">
            <div>
              <Label htmlFor="courseSelect">Select Course</Label>
              <select
                id="courseSelect"
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSelectedBatchId('');
                }}
                required
                className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose Target Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.deliveryModes.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {filteredBatches.length > 0 && (
              <div>
                <Label htmlFor="batchSelect">Select Cohort Batch (Optional)</Label>
                <select
                  id="batchSelect"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Self-Paced (No Specific Batch) --</option>
                  {filteredBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.enrolledCount}/{b.capacity} enrolled)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label htmlFor="marketSelect">Market Context</Label>
              <select
                id="marketSelect"
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value as 'SG' | 'MY')}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SG">Singapore (SG / SGD)</option>
                <option value="MY">Malaysia (MY / MYR)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowGrantModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={grantSubmitting || !selectedCourseId}>
                {grantSubmitting ? 'Granting Access...' : 'Confirm Access Grant'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
