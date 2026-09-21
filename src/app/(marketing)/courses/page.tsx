import React from 'react';
import Link from 'next/link';
import { CourseService } from '@/core/services/course.service';
import { StoreDiscoveryService } from '@/core/services/store-discovery.service';
import { formatCurrency } from '@/lib/format-currency';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { getResolvedMarketCode } from '@/lib/server-market';
import { MarketCode } from '@/core/domain/domain-types';

export const metadata = {
  title: 'Course Catalog | Multi-Market BIM LMS',
  description: 'Explore professional BIM courses available in Singapore & Malaysia.',
};

export const revalidate = 0; // Dynamic server rendering

interface CoursesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

async function getPublishedCoursesData(marketCode: MarketCode) {
  try {
    const courses = await CourseService.listCourses({ status: 'published' });
    const storeProducts = await StoreDiscoveryService.getProductOffersForMarket(marketCode);

    const offerMap = new Map<string, { priceMinorUnits: number; currency: string }>();
    for (const prod of storeProducts) {
      if (prod.offers && prod.offers.length > 0) {
        const firstOffer = prod.offers[0];
        offerMap.set(prod.courseId, {
          priceMinorUnits: firstOffer.priceMinorUnits,
          currency: firstOffer.currency
        });
      }
    }

    return { courses, offerMap };
  } catch (err) {
    console.error('Failed to load published courses:', err);
    return { courses: [], offerMap: new Map() };
  }
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const marketCode = await getResolvedMarketCode(resolvedSearchParams);
  const { courses, offerMap } = await getPublishedCoursesData(marketCode);

  return (
    <div className="space-y-12 py-8">
      <Section className="py-10 bg-slate-100/60 dark:bg-slate-900/40">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Course Catalog</h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Industry-aligned Building Information Modeling courses for engineers and BIM professionals.
            </p>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          {courses.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Courses Available</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                There are currently no published courses in the catalog. Please check back soon.
              </p>
              <Link href="/" className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">
                Return to Home
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course) => {
                const offerInfo = offerMap.get(course.id);

                return (
                  <Card key={course.id} className="flex flex-col h-full hover:border-blue-500/50 transition-all shadow-sm hover:shadow">
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-200 dark:bg-slate-800 rounded-t-xl">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold">
                          No Thumbnail
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-1">
                        <Badge variant="secondary" className="capitalize">
                          {course.level}
                        </Badge>
                      </div>
                    </div>

                    <CardHeader className="flex-1 space-y-2">
                      <CardTitle className="text-xl line-clamp-2">
                        <Link href={`/courses/${course.slug}`} className="hover:text-blue-600 transition-colors">
                          {course.title}
                        </Link>
                      </CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                        {course.description}
                      </p>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-4">
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>⏱️ {course.estimatedHours} Hours</span>
                          <span>•</span>
                          <span className="capitalize">
                            {course.deliveryModes?.map(m => m.replace('_', ' ')).join(', ')}
                          </span>
                        </div>
                        {offerInfo ? (
                          <div className="text-right">
                            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                              {formatCurrency(offerInfo.priceMinorUnits, offerInfo.currency)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              Not currently available
                            </span>
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/courses/${course.slug}`}
                        className="block w-full text-center py-2.5 px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        View Course Details
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </Container>
      </Section>
    </div>
  );
}
