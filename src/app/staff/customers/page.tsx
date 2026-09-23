'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Filter, BookOpen, CreditCard, ChevronRight, UserCheck, ArrowRight } from 'lucide-react';

interface ICustomerListItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  globalRoles: string[];
  status: string;
  activeEnrollmentCount: number;
  purchasesCount: number;
  createdAt: string;
}

interface IPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export default function StaffCustomersPage() {
  const [items, setItems] = useState<ICustomerListItem[]>([]);
  const [pagination, setPagination] = useState<IPagination>({ page: 1, limit: 15, totalItems: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = (targetPage = 1) => {
    setLoading(true);
    const query = new URLSearchParams();
    query.set('page', targetPage.toString());
    query.set('limit', '15');
    if (search.trim()) query.set('search', search.trim());
    if (status) query.set('status', status);

    fetch(`/api/v1/staff/customers?${query.toString()}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setItems(res.data.items);
          setPagination(res.data.pagination);
        } else {
          setError(res.error?.message || 'Failed to load customer records.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers(1);
  }, [status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Customer & Student Directory"
        description="Search, view, and manage registered student accounts, course enrollments, and commercial purchases."
        badge={<Badge variant="default">{pagination.totalItems} Total Records</Badge>}
      />

      {/* Filter Controls */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by student name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="w-full sm:w-56">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { label: 'All Account Statuses', value: '' },
                  { label: 'Active Status', value: 'active' },
                  { label: 'Suspended Status', value: 'suspended' }
                ]}
              />
            </div>
            <Button type="submit" variant="primary" leftIcon={<Filter className="w-4 h-4" />}>
              Filter Results
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table / Loading / Empty / Error */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState
          title="Error Loading Customer Records"
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={() => fetchCustomers(1)}>
              Retry Loading
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No Customer Records Found"
          description={search ? `No student accounts matched "${search}".` : 'There are no registered customer records in the database.'}
          action={
            search ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  fetchCustomers(1);
                }}
              >
                Clear Search Query
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer / Student</TableHead>
                  <TableHead>Global Roles</TableHead>
                  <TableHead>Enrollments</TableHead>
                  <TableHead>Orders / Purchases</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Registered Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{c.fullName}</p>
                        <p className="text-xs text-slate-500">{c.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {c.globalRoles.map((r) => (
                          <Badge key={r} variant="secondary" className="capitalize text-[10px]">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                      <div className="flex items-center gap-1.5 text-xs">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{c.activeEnrollmentCount} Active</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                      <div className="flex items-center gap-1.5 text-xs">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{c.purchasesCount} Orders</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'active' ? 'success' : 'destructive'} className="capitalize text-xs">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/staff/customers/${c.id}`}>
                        <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                          Customer 360
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <span className="text-xs text-slate-500 font-medium">
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total customers)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchCustomers(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchCustomers(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
