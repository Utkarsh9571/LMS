import React from 'react';
import Link from 'next/link';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { CertificateModel } from '@/core/domain/certificate.model';
import { CourseModel } from '@/core/domain/course.model';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">My Certificates</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          View and verify your issued BIM course completion certificates.
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card className="max-w-md mx-auto text-center p-8">
          <CardTitle className="text-lg mb-2">No Certificates Issued Yet</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Complete your course requirements and assessments to earn your official BIM certificate.
          </p>
          <Link href="/dashboard/courses" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md">
            Go to My Courses
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => {
            const course = courseMap.get(cert.courseId.toString());

            return (
              <Card key={cert._id.toString()} className="border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {cert.certificateNumber}
                    </span>
                    <Badge variant={cert.isRevoked ? 'destructive' : 'success'} className="text-xs">
                      {cert.isRevoked ? 'Revoked' : 'Verified'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    {course?.title || 'BIM Course'}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p>Recipient: {cert.studentSnapshot?.fullName}</p>
                    <p>Issued On: {new Date(cert.issuedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/verify/${cert.certificateNumber}`}
                      target="_blank"
                      className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Public Verification Link ↗
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
