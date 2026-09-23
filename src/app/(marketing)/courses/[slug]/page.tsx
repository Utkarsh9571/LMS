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
import { Button } from '@/components/ui/button';
import { getResolvedMarketCode } from '@/lib/server-market';
import { getSessionFromCookies } from '@/lib/session';
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Video,
  FileText,
  HelpCircle,
  Calendar,
  CheckCircle2,
  Users,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

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
      title: `${course.title} | BIM Academy`,
      description: course.description
    };
  } catch {
    return {
      title: 'Course Not Found'
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
      status: 'upcoming'
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
          <div className="max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/courses">
                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-slate-800" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Back to Courses
                </Button>
              </Link>
              <span className="text-slate-700">•</span>
              <Badge variant="secondary" className="capitalize">
                {course.level} Level
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              {course.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              {course.description}
            </p>

            <div className="flex flex-wrap gap-8 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Duration</span>
                  <span className="font-bold text-white">{course.estimatedHours} Hours</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Delivery Mode</span>
                  <span className="font-bold text-white capitalize">
                    {course.deliveryModes?.map((m) => m.replace('_', ' ')).join(', ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Main Content Grid */}
      <Section>
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Curriculum & Batches */}
            <div className="lg:col-span-2 space-y-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  Course Curriculum
                </h2>

                {curriculum.modules.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    No modules published yet for this course.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {curriculum.modules.map((moduleIndex, idx) => (
                      <div
                        key={moduleIndex.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs"
                      >
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            Module {idx + 1}: {moduleIndex.title}
                          </h3>
                          <span className="text-xs font-semibold text-slate-500">
                            {moduleIndex.lessons?.length || 0} Lessons
                          </span>
                        </div>

                        {moduleIndex.description && (
                          <div className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                            {moduleIndex.description}
                          </div>
                        )}

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {moduleIndex.lessons?.map((lesson) => (
                            <div key={lesson.id} className="p-4 flex items-center justify-between text-xs sm:text-sm">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {lesson.contentType === 'video' ? (
                                    <Video className="w-4 h-4 text-blue-500" />
                                  ) : lesson.contentType === 'pdf' ? (
                                    <FileText className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                                  )}
                                </div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {lesson.title}
                                </span>
                              </div>

                              {lesson.isPreviewFree ? (
                                <Badge variant="success" size="sm">
                                  Free Preview
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Enrolled Only</span>
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
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Upcoming Live Cohort Batches
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {batches.map((batch) => (
                      <Card key={batch.id}>
                        <CardHeader className="p-4">
                          <CardTitle className="text-sm sm:text-base flex items-center justify-between">
                            <span>{batch.name}</span>
                            <Badge variant="outline">{batch.code}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            <span>Starts: {new Date(batch.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Capacity: {batch.capacity} Students</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar: Pricing & Enrollment */}
            <div className="space-y-6">
              <Card className="sticky top-24 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Enrollment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {offer ? (
                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-4 rounded-xl space-y-1 text-center">
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold">
                        Market Price ({offer.marketCode})
                      </p>
                      <p className="text-3xl font-extrabold text-blue-700 dark:text-blue-300">
                        {formatCurrency(offer.priceMinorUnits, offer.currency)}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center">
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                        Availability
                      </p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
                        Not currently available for enrollment in active market.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {offer && productId ? (
                      session ? (
                        <Link href={`/checkout?productId=${productId}`} className="block">
                          <Button variant="primary" className="w-full" size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                            Enroll Now
                          </Button>
                        </Link>
                      ) : (
                        <Link
                          href={`/login?redirect=${encodeURIComponent(`/checkout?productId=${productId}`)}`}
                          className="block"
                        >
                          <Button variant="primary" className="w-full" size="lg" rightIcon={<ChevronRight className="w-4 h-4" />}>
                            Sign In to Enroll
                          </Button>
                        </Link>
                      )
                    ) : (
                      <Button disabled className="w-full" size="lg">
                        Not Available
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Full course access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Verified digital certificate</span>
                    </div>
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
