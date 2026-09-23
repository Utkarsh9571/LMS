'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Layers, 
  Clock, 
  Plus, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  FileText, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';

interface ICourseItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  thumbnailUrl: string;
  status: 'draft' | 'published' | 'archived';
  deliveryModes: string[];
  estimatedHours: number;
  createdAt: string;
  updatedAt: string;
}

export default function StaffCoursesPage() {
  const [courses, setCourses] = useState<ICourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Create Course Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: '',
    slug: '',
    description: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    estimatedHours: 20
  });

  const fetchCourses = () => {
    setLoading(true);
    setError(null);
    const query = statusFilter ? `?status=${statusFilter}` : '';
    fetch(`/api/v1/courses${query}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setCourses(res.data);
        } else {
          setError(res.error?.message || 'Failed to load course catalog.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, [statusFilter]);

  const handleTitleChange = (val: string) => {
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setCreateForm((prev) => ({
      ...prev,
      title: val,
      slug: generatedSlug
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.title || !createForm.slug || !createForm.description) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch('/api/v1/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title,
          slug: createForm.slug,
          description: createForm.description,
          level: createForm.level,
          estimatedHours: Number(createForm.estimatedHours),
          status: 'draft',
          deliveryModes: ['self_paced']
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setCreateForm({
          title: '',
          slug: '',
          description: '',
          level: 'beginner',
          estimatedHours: 20
        });
        fetchCourses();
      } else {
        setCreateError(data.error?.message || 'Failed to create course.');
      }
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Course Catalog & Curriculum Engine"
        description="Canonical curriculum management surface. Manage courses, modules, lessons, drip rules, and content structure."
      >
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Course</span>
        </Button>
      </PageHeader>

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search courses by title, slug, or summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'published', label: 'Published' },
              { value: 'draft', label: 'Draft' },
              { value: 'archived', label: 'Archived' }
            ]}
          />
        </div>
      </div>

      {/* Course List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState
          title="Course Catalog Load Error"
          message={error}
          action={
            <Button size="sm" variant="outline" onClick={fetchCourses}>
              Retry Load
            </Button>
          }
        />
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          title="No Courses Found"
          description={
            searchQuery || statusFilter
              ? 'No courses match your current search or status filter criteria.'
              : 'There are currently no courses registered in the canonical catalog.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      course.status === 'published'
                        ? 'success'
                        : course.status === 'draft'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="uppercase font-bold text-[10px]"
                  >
                    {course.status}
                  </Badge>

                  <Badge variant="outline" className="capitalize text-[10px] font-semibold">
                    {course.level} Level
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    /{course.slug}
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {course.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {course.estimatedHours}h
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    {course.deliveryModes.join(', ').replace('_', ' ')}
                  </span>
                </div>

                <Link
                  href={`/staff/courses/${course.id}`}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Curriculum</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Course Dialog Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Canonical Course"
        description="Add a new canonical course to the learning curriculum engine. Zero commercial fields are permitted in this boundary."
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
              Course Title *
            </label>
            <Input
              type="text"
              value={createForm.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Building Information Modeling & Revit Masterclass"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              URL Slug *
            </label>
            <Input
              type="text"
              value={createForm.slug}
              onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
              placeholder="e.g. bim-revit-masterclass"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Course Summary / Description *
            </label>
            <Input
              type="text"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Comprehensive course outline and learning outcomes..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Difficulty Level *
              </label>
              <Select
                value={createForm.level}
                onChange={(e) => setCreateForm({ ...createForm, level: e.target.value as any })}
                options={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' }
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estimated Hours *
              </label>
              <Input
                type="number"
                min={1}
                value={createForm.estimatedHours}
                onChange={(e) => setCreateForm({ ...createForm, estimatedHours: Number(e.target.value) })}
                required
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
              disabled={createLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {createLoading ? 'Creating...' : 'Create Course'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
