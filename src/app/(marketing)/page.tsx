import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Multi-Market LMS Platform | Professional BIM & Engineering Training',
  description: 'Structured, industry-standard Building Information Modeling (BIM) training courses tailored for Singapore and Malaysia professionals.',
};

export default function MarketingHomePage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <Section className="py-12 md:py-20 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20">
        <Container>
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-semibold">
              <span>Singapore (SG) & Malaysia (MY) Markets Active</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Professional BIM & Engineering Education
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Master Building Information Modeling (BIM) through structured self-paced modules, interactive live cohort batches, and hands-on industry workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
              >
                Explore Course Catalog
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* Key Product Value Pillars */}
      <Section>
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Built for Industry Practitioners</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              Designed specifically for AEC (Architecture, Engineering & Construction) engineers and Revit BIM modelers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl mb-4">
                  01
                </div>
                <CardTitle className="text-xl">Structured Curriculum</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Comprehensive, modular learning tracks spanning Structural Design, MEP Coordination, and ISO 19650 BIM Management standards.
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xl mb-4">
                  02
                </div>
                <CardTitle className="text-xl">Flexible Delivery Modes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Choose between on-demand self-paced video lessons or guided live cohort batches with real-time instructor feedback.
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xl mb-4">
                  03
                </div>
                <CardTitle className="text-xl">Multi-Market Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Native multi-currency support (SGD/MYR) with local payment integration optimized for Singapore and Malaysia.
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      {/* Featured Call to Action */}
      <Section className="py-12">
        <Container>
          <div className="bg-slate-900 text-white rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto shadow-xl">
            <h2 className="text-3xl font-bold mb-4">Ready to advance your BIM engineering career?</h2>
            <p className="text-slate-300 max-w-xl mx-auto mb-8">
              Join hundreds of engineering professionals upskilling in Building Information Modeling.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-base font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors"
              >
                Browse All Courses
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-base font-semibold text-white border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                Learn About Our Platform
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
