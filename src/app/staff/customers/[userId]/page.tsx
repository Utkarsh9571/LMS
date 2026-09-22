'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';

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

export default function StaffCustomerDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const [data, setData] = useState<ICustomer360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 rounded-lg">
        <p className="font-semibold">Customer 360 Error</p>
        <p className="text-sm">{error || 'Customer profile not found'}</p>
      </div>
    );
  }

  const { profile, enrollments, purchases, certificates, entitlements } = data;

  return (
    <div className="space-y-8">
      {/* Back Link & Header */}
      <div>
        <Link href="/staff/customers" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Customer Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.fullName}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Customer ID: <code className="font-mono text-xs">{profile.id}</code>
            </p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-bold uppercase rounded-full self-start sm:self-auto ${
              profile.status === 'active'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
            }`}
          >
            Account: {profile.status}
          </span>
        </div>
      </div>

      {/* Customer Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Details Card */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            Profile Details
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Email Address</span>
              <span className="font-semibold text-slate-900 dark:text-white">{profile.email}</span>
            </div>
            {profile.phone && (
              <div>
                <span className="text-xs text-slate-500 block">Phone Number</span>
                <span className="font-semibold text-slate-900 dark:text-white">{profile.phone}</span>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-500 block">Global Roles</span>
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {profile.globalRoles.map((r) => (
                  <span key={r} className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Registered On</span>
              <span className="text-xs text-slate-700 dark:text-slate-300">{new Date(profile.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Enrollments & Learning Progress */}
        <div className="md:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            Course Enrollments ({enrollments.length})
          </h2>

          {enrollments.length === 0 ? (
            <p className="text-xs text-slate-500">No active course enrollments.</p>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e) => (
                <div key={e.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{e.courseTitle}</p>
                    {e.batchName && <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Cohort: {e.batchName}</p>}
                    <p className="text-[11px] text-slate-500 mt-1">Enrolled: {new Date(e.enrolledAt).toLocaleDateString()}</p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {e.status}
                    </span>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">Progress: {e.progressPercent}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Purchases & Orders Ledger */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
          Purchase & Orders History ({purchases.length})
        </h2>

        {purchases.length === 0 ? (
          <p className="text-xs text-slate-500">No purchase records found for this customer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Product / Service</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Market</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-mono text-xs font-bold text-slate-900 dark:text-white">{p.orderNumber}</td>
                    <td className="p-3 font-semibold">{p.productTitle}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {(p.totalMinorUnits / 100).toLocaleString('en-US', { style: 'currency', currency: p.currency })}
                    </td>
                    <td className="p-3"><span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">{p.marketCode}</span></td>
                    <td className="p-3"><span className={`px-2 py-0.5 text-xs font-bold uppercase rounded ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700'}`}>{p.status}</span></td>
                    <td className="p-3 text-right">
                      <Link href={`/staff/sales/${p.orderNumber}`} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                        Order Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Certificates & Entitlements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Entitlements */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            Granted Entitlements ({entitlements.length})
          </h2>
          {entitlements.length === 0 ? (
            <p className="text-xs text-slate-500">No active entitlements found.</p>
          ) : (
            <div className="space-y-2">
              {entitlements.map((ent) => (
                <div key={ent.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white uppercase">{ent.targetType}: {ent.targetId}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Granted: {new Date(ent.grantedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${ent.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'}`}>{ent.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Certificates */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            Issued Certificates ({certificates.length})
          </h2>
          {certificates.length === 0 ? (
            <p className="text-xs text-slate-500">No certificates issued yet.</p>
          ) : (
            <div className="space-y-2">
              {certificates.map((c) => (
                <div key={c.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{c.certificateNumber}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Issued: {new Date(c.issuedAt).toLocaleDateString()}</p>
                  </div>
                  <a href={`/verify/${c.certificateNumber}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    Verify Certificate ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
