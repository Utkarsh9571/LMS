import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Globe, ShieldCheck, Users, Award, BookOpen, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'About BIM Academy | BIM & AEC Education Singapore & Malaysia',
  description: 'Learn about BIM Academy, our mission, accredited curriculum, and industry training standards for AEC professionals.'
};

export default function AboutPage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <Section className="py-12 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Badge variant="default">AEC Industry Standard</Badge>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              About BIM Academy
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Empowering engineers, architects, and BIM modelers across Singapore and Malaysia with practical, accredited Building Information Modeling education.
            </p>
          </div>
        </Container>
      </Section>

      {/* Mission & Standards */}
      <Section>
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Our Mission
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                The AEC industry is rapidly shifting toward digital project delivery and ISO 19650 standards. BIM Academy bridges the gap between traditional engineering and modern 3D/4D/5D modeling workflows.
              </p>
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Aligned with BCA Singapore & CIDB Malaysia frameworks</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Dual-market currency & regulatory support</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                  <Award className="w-4 h-4 text-indigo-500" />
                  <span>Cryptographically verifiable certificate issuance</span>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Singapore & Malaysia Operations</h3>
                  <p className="text-xs text-slate-400">Regional Excellence Center</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Our courses combine self-paced modular video lessons with live cohort workshops hosted by experienced Lead BIM Managers.
              </p>
              <Link href="/courses">
                <Button size="sm" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explore Our Courses
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
