import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CourseService } from '@/core/services/course.service';
import { BatchService } from '@/core/services/batch.service';
import { StoreDiscoveryService, IStoreOfferDiscoveryDTO } from '@/core/services/store-discovery.service';
import { ICourseSafeDTO, ICurriculumDTO, IBatchSafeDTO } from '@/core/domain/domain-types';
import { formatCurrency } from '@/lib/format-currency';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { getResolvedMarketCode } from '@/lib/server-market';

import { getSessionFromCookies } from '@/lib/session';

export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const course = await CourseService.getCourse(slug);
    return {
      title: `${course.title} | LMS Platform`,
      description: course.description,
    };
  } catch {
    return {
      title: 'Course Not Found',
    };
  }
}

export default async function CourseDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const marketCode = await getResolvedMarketCode(resolvedSearchParams);
  const session = await getSessionFromCookies();

  let course: ICourseSafeDTO;
  let curriculum: ICurriculumDTO;
  let batches: IBatchSafeDTO[] = [];
  let offer: IStoreOfferDiscoveryDTO | null = null;

  try {
    course = await CourseService.getCourse(slug);
    curriculum = await CourseService.getCurriculum(course.id);
  } catch {
    notFound();
  }

  try {
    batches = await BatchService.listBatches({
      courseId: course.id,
      marketCode,
      status: 'enrolling'
    });
  } catch {
    batches = [];
  }

  let productId: string | null = null;
  try {
    const storeProducts = await StoreDiscoveryService.getProductOffersForMarket(marketCode, course.id);
    if (storeProducts.length > 0 && storeProducts[0].offers.length > 0) {
      productId = storeProducts[0].id;
      offer = storeProducts[0].offers[0];
    }
  } catch {
    offer = null;
  }

  return (
    <div className="space-y-12 py-8">
      {/* Course Hero Header */}
      <Section className="py-12 bg-slate-900 text-white">
        <Container>
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/courses" className="text-sm font-medium text-blue-400 hover:underline">
                ← Back to Courses
              </Link>
              <span className="text-slate-600">•</span>
              <Badge variant="secondary" className="capitalize">
                {course.level} Level
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              {course.title}
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed">
              {course.description}
            </p>

            <div className="flex flex-wrap gap-6 text-sm text-slate-300 pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-400 block text-xs uppercase tracking-wider">Estimated Duration</span>
                <span className="font-semibold text-white">{course.estimatedHours} Hours</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs uppercase tracking-wider">Delivery Mode</span>
                <span className="font-semibold text-white capitalize">
                  {course.deliveryModes?.map(m => m.replace('_', ' ')).join(', ')}
                </span>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Curriculum */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Course Curriculum</h2>
                
                {curriculum.modules.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400 italic">No modules published yet for this course.</p>
                ) : (
                  <div className="space-y-6">
                    {curriculum.modules.map((moduleIndex, idx) => (
                      <div
                        key={moduleIndex.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                      >
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            Module {idx + 1}: {moduleIndex.title}
                          </h3>
                          <span className="text-xs text-slate-500 font-medium">
                            {moduleIndex.lessons?.length || 0} Lessons
                          </span>
                        </div>

                        {moduleIndex.description && (
                          <div className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/50">
                            {moduleIndex.description}
                          </div>
                        )}

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {moduleIndex.lessons?.map((lesson) => (
                            <div key={lesson.id} className="p-4 flex items-center justify-between text-sm">
                              <div className="flex items-center gap-3">
                                <span className="text-slate-400 font-mono text-xs">
                                  {lesson.contentType === 'video' ? '📹' : lesson.contentType === 'pdf' ? '📄' : '📝'}
                                </span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {lesson.title}
                                </span>
                              </div>

                              {lesson.isPreviewFree ? (
                                <Badge variant="success" className="text-xs">
                                  Free Preview
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400">Enrolled Only</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Cohort Batches */}
              {batches.length > 0 && (
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Upcoming Live Batches</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {batches.map((batch) => (
                      <Card key={batch.id}>
                        <CardHeader className="p-4">
                          <CardTitle className="text-base">{batch.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                          <p>Code: <span className="font-mono">{batch.code}</span></p>
                          <p>Start Date: {new Date(batch.startDate).toLocaleDateString()}</p>
                          <p>Capacity: {batch.capacity} Students</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar CTA & Pricing */}
            <div className="space-y-6">
              <Card className="sticky top-24 border-slate-200 dark:border-slate-800 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl">Enrollment & Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {offer ? (
                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 p-4 rounded-lg space-y-2 text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold">
                        Market Price ({offer.marketCode})
                      </p>
                      <p className="text-3xl font-extrabold text-blue-700 dark:text-blue-300">
                        {formatCurrency(offer.priceMinorUnits, offer.currency)}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg text-center">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        Availability
                      </p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                        Not currently available for enrollment in this market.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {offer && productId ? (
                      batches.length > 1 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Choose your batch</p>
                          {batches.map((batch) => (
                            <Link
                              key={batch.id}
                              href={session ? `/checkout?productId=${productId}&batchId=${batch.id}` : `/login?redirect=${encodeURIComponent(`/checkout?productId=${productId}&batchId=${batch.id}`)}`}
                              className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-sm text-slate-900 dark:text-white">{batch.name}</span>
                                <span className="text-xs text-slate-500">{batch.enrolledCount}/{batch.capacity}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">Starts {new Date(batch.startDate).toLocaleDateString()}</p>
                            </Link>
                          ))}
                        </div>
                      ) : (
                      session ? (
                        <Link
                          href={`/checkout?productId=${productId}${batches.length === 1 ? `&batchId=${batches[0].id}` : ''}`}
                          className="block w-full text-center py-3 px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          Enroll Now
                        </Link>
                      ) : (
                        <Link
                          href={`/login?redirect=${encodeURIComponent(`/checkout?productId=${productId}${batches.length === 1 ? `&batchId=${batches[0].id}` : ''}`)}`}
                          className="block w-full text-center py-3 px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          Sign In to Enroll
                        </Link>
                      )
                    ) : (
                      <button
                        disabled
                        className="block w-full text-center py-3 px-4 rounded-md text-sm font-semibold text-slate-400 bg-slate-200 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                      >
                        Not Available
                      </button>
                    )}
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                      Standard lifetime access to course materials and updates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
