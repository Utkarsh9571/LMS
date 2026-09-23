import React from 'react';
import Link from 'next/link';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { CertificateModel } from '@/core/domain/certificate.model';
import { CourseModel } from '@/core/domain/course.model';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Award, ShieldCheck, ExternalLink, Calendar, ArrowRight, User } from 'lucide-react';

export const revalidate = 0;

export default async function StudentCertificatesPage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();
  const certificates = await CertificateModel.find({ userId: session.userId }).sort({ issuedAt: -1 });

  const courseIds = certificates.map((c) => c.courseId);
  const courses = await CourseModel.find({ _id: { $in: courseIds } });
  const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Issued Certificates"
        description="Access and share your verified Building Information Modeling course completion certificates."
        badge={<Badge variant="default">{certificates.length} Credentials</Badge>}
      />

      {certificates.length === 0 ? (
        <EmptyState
          title="No Certificates Issued Yet"
          description="Complete your course curriculum requirements and required assessments to earn your official BIM certificate."
          action={
            <Link href="/dashboard/courses">
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Go to My Courses
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => {
            const course = courseMap.get(cert.courseId.toString());

            return (
              <Card key={cert._id.toString()} className="border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/60 p-4 border-b border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {cert.certificateNumber}
                    </span>
                    <Badge variant={cert.isRevoked ? 'destructive' : 'success'} className="text-xs">
                      {cert.isRevoked ? 'Revoked' : 'Verified Credential'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">
                    {course?.title || 'BIM Certificate'}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Recipient: <span className="font-semibold text-slate-900 dark:text-white">{cert.studentSnapshot?.fullName}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Issued On: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authentic & Valid</span>
                    </div>

                    <Link href={`/verify/${cert.certificateNumber}`} target="_blank">
                      <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                        Verify Online
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
