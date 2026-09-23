'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Users, 
  Tag, 
  Layers, 
  Globe, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';

interface IServiceSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  deliverableType: 'course' | 'batch';
  targetId: string;
  targetTitle: string;
  marketCode: 'SG' | 'MY';
  currency: string;
  basePriceMinorUnits: number;
  displayOriginalPriceMinorUnits: number | null;
  offerId: string;
  isActive: boolean;
  activeUserCount: number;
  createdAt: string;
}

interface ICourseOption {
  id: string;
  title: string;
}

interface IBatchOption {
  id: string;
  name: string;
  code: string;
}

export default function StaffServicesPage() {
  const searchParams = useSearchParams();
  const [services, setServices] = useState<IServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'all' | 'SG' | 'MY'>('all');

  // Create Service Wizard State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [courses, setCourses] = useState<ICourseOption[]>([]);
  const [batches, setBatches] = useState<IBatchOption[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    deliverableType: 'course' as 'course' | 'batch',
    targetId: '',
    priceMajor: 99,
    displayOriginalPriceMajor: 149
  });

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  const fetchServices = () => {
    setLoading(true);
    setError(null);
    fetch('/api/v1/services')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setServices(res.data);
        } else {
          setError(res.error?.message || 'Failed to load commercial services.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch deliverable targets when modal opens
  useEffect(() => {
    if (isCreateOpen) {
      if (form.deliverableType === 'course' && courses.length === 0) {
        fetch('/api/v1/courses')
          .then((res) => res.json())
          .then((res) => {
            if (res.success) {
              setCourses(res.data.map((c: any) => ({ id: c.id, title: c.title })));
              if (res.data.length > 0) setForm((prev) => ({ ...prev, targetId: res.data[0].id }));
            }
          });
      } else if (form.deliverableType === 'batch' && batches.length === 0) {
        fetch('/api/v1/batches')
          .then((res) => res.json())
          .then((res) => {
            if (res.success) {
              setBatches(res.data.map((b: any) => ({ id: b.id, name: b.name, code: b.code })));
              if (res.data.length > 0) setForm((prev) => ({ ...prev, targetId: res.data[0].id }));
            }
          });
      }
    }
  }, [isCreateOpen, form.deliverableType]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!form.title || !form.description || !form.targetId) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch('/api/v1/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          deliverableType: form.deliverableType,
          targetId: form.targetId,
          priceMinorUnits: Math.round(form.priceMajor * 100),
          displayOriginalPriceMinorUnits: form.displayOriginalPriceMajor ? Math.round(form.displayOriginalPriceMajor * 100) : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setForm({
          title: '',
          description: '',
          deliverableType: 'course',
          targetId: '',
          priceMajor: 99,
          displayOriginalPriceMajor: 149
        });
        fetchServices();
      } else {
        setCreateError(data.error?.message || 'Failed to create commercial program.');
      }
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredServices = services.filter((s) => {
    if (marketFilter !== 'all' && s.marketCode !== marketFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.targetTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Services & Programs Management"
        description="Commercial offering catalog managing commercial packages (Products & Offers), deliverable target access, market pricing, and active student enrollment counts."
      >
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Program Offering</span>
        </Button>
      </PageHeader>

      {/* Toolbar Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by program title, description, or target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value as any)}
            options={[
              { value: 'all', label: 'All Markets' },
              { value: 'SG', label: 'Singapore (SG - SGD)' },
              { value: 'MY', label: 'Malaysia (MY - MYR)' }
            ]}
          />
        </div>
      </div>

      {/* Services Table */}
      {loading ? (
        <Card className="p-6">
          <Skeleton className="h-64 w-full rounded-xl" />
        </Card>
      ) : error ? (
        <ErrorState
          title="Services Catalog Error"
          message={error}
          action={
            <Button size="sm" variant="outline" onClick={fetchServices}>
              Retry Load
            </Button>
          }
        />
      ) : filteredServices.length === 0 ? (
        <EmptyState
          title="No Services Found"
          description={
            searchQuery || marketFilter !== 'all'
              ? 'No commercial services match your current search or market filter.'
              : 'There are currently no commercial program offerings created.'
          }
        />
      ) : (
        <Card className="p-5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program / Service</TableHead>
                <TableHead>Target Deliverable Content</TableHead>
                <TableHead>Market Price</TableHead>
                <TableHead>Active Users</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((s) => (
                <TableRow key={`${s.id}_${s.offerId}`}>
                  <TableCell>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{s.title}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{s.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 font-semibold text-xs">
                      {s.deliverableType === 'course' ? (
                        <BookOpen className="w-3 h-3 text-blue-500" />
                      ) : (
                        <Calendar className="w-3 h-3 text-indigo-500" />
                      )}
                      <span>
                        {s.deliverableType.toUpperCase()}: {s.targetTitle}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-slate-900 dark:text-white">
                    {(s.basePriceMinorUnits / 100).toLocaleString('en-US', {
                      style: 'currency',
                      currency: s.currency
                    })}
                  </TableCell>
                  <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {s.activeUserCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono font-bold text-xs uppercase">
                      {s.marketCode} ({s.currency})
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? 'success' : 'secondary'} className="font-bold uppercase">
                      {s.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={s.deliverableType === 'course' ? `/staff/courses/${s.targetId}` : `/staff/workshops`}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Content →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Program Offering Dialog Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Program Offering"
        description="Package a canonical Course or Cohort Batch into a commercial Product with market-specific pricing."
      >
        {createError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Commercial Program Title *
            </label>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. BIM & Revit Architecture Certification Program"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Program Description *
            </label>
            <Input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Commercial summary of program deliverables and outcomes..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deliverable Type *
              </label>
              <Select
                value={form.deliverableType}
                onChange={(e) => setForm({ ...form, deliverableType: e.target.value as any, targetId: '' })}
                options={[
                  { value: 'course', label: 'Course (Self-paced)' },
                  { value: 'batch', label: 'Batch (Cohort/Live)' }
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Educational Content *
              </label>
              {form.deliverableType === 'course' ? (
                <Select
                  value={form.targetId}
                  onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                  options={courses.map((c) => ({
                    value: c.id,
                    label: c.title
                  }))}
                />
              ) : (
                <Select
                  value={form.targetId}
                  onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                  options={batches.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.code})`
                  }))}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price (Major Currency Units) *
              </label>
              <Input
                type="number"
                min={0}
                value={form.priceMajor}
                onChange={(e) => setForm({ ...form, priceMajor: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Original Strike-through Price
              </label>
              <Input
                type="number"
                min={0}
                value={form.displayOriginalPriceMajor}
                onChange={(e) => setForm({ ...form, displayOriginalPriceMajor: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createLoading || !form.targetId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {createLoading ? 'Publishing...' : 'Publish Program Offering'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

