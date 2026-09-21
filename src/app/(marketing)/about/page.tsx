import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'About LMS Platform | Professional Multi-Market BIM Education',
  description: 'Learn about our custom modular Learning Management System built for BIM & engineering education in Singapore and Malaysia.',
};

export default function AboutPage() {
  return (
    <div className="space-y-12 py-8">
      <Section className="py-12 bg-gradient-to-b from-blue-50/40 to-transparent dark:from-blue-950/20">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">
              About LMS Platform
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              A specialized, modular Learning Management System designed to deliver industry-standard Building Information Modeling (BIM) and civil engineering education across Singapore and Malaysia.
            </p>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Specialized BIM Training</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <p>
                    Our curriculum focuses specifically on practical AEC workflows, including Revit Structural modeling, MEP coordination, automated clash detection, and ISO 19650 compliant BIM execution plans.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dual Learning Models</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <p>
                    Whether you require self-paced video access with progressive drip unlocks or structured live cohort schedules with dedicated instructor sessions, our platform caters to working engineering professionals.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Multi-Market Engineering Architecture</h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Operating natively in Singapore (SG) and Malaysia (MY), our platform features server-resolved market isolation. Learners receive currency-localized course offerings (SGD / MYR) alongside region-specific payment processing and batch schedules.
              </p>
            </div>

            <div className="text-center pt-4">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Browse Our Courses
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
