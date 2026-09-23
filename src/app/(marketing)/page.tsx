import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  BookOpen,
  Users,
  Award,
  Globe,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { CourseService } from '@/core/services/course.service';
import { StoreDiscoveryService } from '@/core/services/store-discovery.service';
import { formatCurrency } from '@/lib/format-currency';

export const metadata = {
  title: 'BIM Academy | Professional Building Information Modeling Education',
  description: 'Industry-leading Building Information Modeling (BIM) & AEC engineering training for Singapore and Malaysia professionals.'
};

export const revalidate = 60; // Revalidate every minute

async function getFeaturedCourses() {
  try {
    const courses = await CourseService.listCourses({ status: 'published' });
    const storeProducts = await StoreDiscoveryService.getProductOffersForMarket('SG');

    const offerMap = new Map<string, { priceMinorUnits: number; currency: string }>();
    for (const prod of storeProducts) {
      if (prod.offers && prod.offers.length > 0) {
        offerMap.set(prod.courseId, {
          priceMinorUnits: prod.offers[0].priceMinorUnits,
          currency: prod.offers[0].currency
        });
      }
    }

    return { courses: courses.slice(0, 3), offerMap };
  } catch (err) {
    return { courses: [], offerMap: new Map() };
  }
}

export default async function MarketingHomePage() {
  const { courses, offerMap } = await getFeaturedCourses();

  return (
    <div className="space-y-16 md:space-y-24 py-6 md:py-12">
      {/* Hero Section */}
      <Section className="py-8 md:py-16">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold">
                <Globe className="w-3.5 h-3.5" />
                <span>Singapore & Malaysia Industry Standard</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                Master <span className="text-blue-600 dark:text-blue-400">BIM</span> & AEC Engineering Workflows
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Elevate your career with accredited Building Information Modeling courses. Practice with real project datasets, ISO 19650 coordination protocols, and live instructor guidance.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Link href="/courses">
                  <Button size="lg" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Explore Catalog
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Create Account
                  </Button>
                </Link>
              </div>

              {/* Trust Metrics */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">100%</div>
                  <div className="text-xs text-slate-500 font-medium">Industry Aligned</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">SGD / MYR</div>
                  <div className="text-xs text-slate-500 font-medium">Native Pricing</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">ISO 19650</div>
                  <div className="text-xs text-slate-500 font-medium">BIM Standards</div>
                </div>
              </div>
            </div>

            {/* Right Card Graphic */}
            <div className="lg:col-span-5">
              <div className="relative p-6 sm:p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-xl border border-slate-700/60 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs font-mono text-slate-400">Revit_MEP_Coordination.rvt</span>
                </div>

                <div className="space-y-4 text-xs font-mono">
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                    <div className="text-blue-400 font-semibold">[Module 01] Architectural & Structural Modeling</div>
                    <div className="text-slate-400 text-[11px]">Level of Development (LOD 300 / 350)</div>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                    <div className="text-emerald-400 font-semibold">[Module 02] Navisworks Clash Matrix</div>
                    <div className="text-slate-400 text-[11px]">Automated Hard & Soft Interference Checks</div>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 space-y-1">
                    <div className="text-indigo-400 font-semibold">[Module 03] ISO 19650 Common Data Env</div>
                    <div className="text-slate-400 text-[11px]">Information Management & Deliverables</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/80">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verified Certificate Included
                  </span>
                  <span className="font-semibold text-white">SGD 499.00</span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Feature Pillars */}
      <Section className="py-12 bg-slate-50/70 dark:bg-slate-900/30 border-y border-slate-200/80 dark:border-slate-800/80">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Engineering Excellence Designed for Practitioners
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Built specifically for architects, MEP engineers, structural modelers, and BIM managers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="h-full">
              <CardHeader className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <CardTitle>Structured Self-Paced Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  High-definition video lessons, downloadable Revit/Navisworks project models, interactive quizzes, and submission-based assignments.
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <CardTitle>Live Cohort Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Join scheduled weekend or evening live sessions hosted by certified BIM Lead Engineers with direct Q&A and code reviews.
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <CardTitle>Verified Industry Credentials</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Earn cryptographically verifiable digital certificates upon 100% course completion and assessment passing scores.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Featured Courses Showcase */}
      {courses.length > 0 && (
        <Section>
          <Container>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Featured Courses</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Start learning with our top-rated professional BIM modules.
                </p>
              </div>
              <Link href="/courses">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View All Courses
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {courses.map((course) => {
                const offer = offerMap.get(course.id);
                return (
                  <Card key={course.id} className="flex flex-col h-full hover:border-blue-500/50 transition-all">
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold text-xs">
                          BIM Academy Course
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="capitalize">
                          {course.level}
                        </Badge>
                      </div>
                    </div>

                    <CardHeader className="flex-1 space-y-2">
                      <CardTitle className="line-clamp-2 text-base sm:text-lg">
                        <Link href={`/courses/${course.slug}`} className="hover:text-blue-600 transition-colors">
                          {course.title}
                        </Link>
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {course.description}
                      </p>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-4">
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
                        <span className="text-slate-500 font-medium">{course.estimatedHours} Hours</span>
                        {offer ? (
                          <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                            {formatCurrency(offer.priceMinorUnits, offer.currency)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Available in Store</span>
                        )}
                      </div>

                      <Link href={`/courses/${course.slug}`} className="block">
                        <Button variant="primary" className="w-full" size="sm">
                          Course Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </Container>
        </Section>
      )}

      {/* Call to Action Banner */}
      <Section className="pb-12">
        <Container>
          <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-xl border border-slate-800 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black">Advance Your AEC Career Today</h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Join engineers and modelers mastering BIM standards across Singapore and Malaysia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Link href="/courses">
                <Button size="lg" className="w-full sm:w-auto">
                  Browse Courses
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-white border-slate-700 hover:bg-slate-800">
                  Register Account
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
