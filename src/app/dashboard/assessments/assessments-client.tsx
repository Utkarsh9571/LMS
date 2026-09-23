'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { FileCheck, HelpCircle, ArrowRight, ExternalLink } from 'lucide-react';

export interface QuizAttemptDisplay {
  id: string;
  attemptNumber: number;
  status: string;
  isPassed: boolean;
  percentageScore: number;
  score: number;
  quizTitle: string;
  lessonTitle: string;
  courseTitle: string;
  courseId: string;
}

export interface AssignmentSubmissionDisplay {
  id: string;
  submissionNumber: number;
  status: string;
  isPassed: boolean | null;
  submittedAt: string;
  percentageScore: number | null;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  assignmentTitle: string;
  lessonTitle: string;
  courseTitle: string;
  courseId: string;
  feedbackMarkdown?: string | null;
}

export interface StudentAssessmentsClientProps {
  quizAttempts: QuizAttemptDisplay[];
  assignmentSubmissions: AssignmentSubmissionDisplay[];
}

export function StudentAssessmentsClient({
  quizAttempts,
  assignmentSubmissions
}: StudentAssessmentsClientProps) {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'assignments'>('quizzes');
  const totalAssessments = quizAttempts.length + assignmentSubmissions.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assessments & Grading"
        description="Track your quiz results, assignment submissions, and academic evaluations."
        badge={<Badge variant="default">{totalAssessments} Total Attempts</Badge>}
      />

      <Tabs
        tabs={[
          {
            id: 'quizzes',
            label: `Quiz Attempts (${quizAttempts.length})`,
            icon: <HelpCircle className="w-4 h-4" />
          },
          {
            id: 'assignments',
            label: `Assignments (${assignmentSubmissions.length})`,
            icon: <FileCheck className="w-4 h-4" />
          }
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'quizzes' | 'assignments')}
      />

      {activeTab === 'quizzes' && (
        <div>
          {quizAttempts.length === 0 ? (
            <EmptyState
              title="No Quiz Attempts Found"
              description="You have not completed any quizzes yet. Open your enrolled courses to attempt module quizzes."
              action={
                <Link href="/dashboard/courses">
                  <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View Enrolled Courses
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {quizAttempts.map((attempt) => (
                <Card key={attempt.id} className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={attempt.isPassed ? 'success' : 'destructive'} className="text-xs">
                          {attempt.isPassed ? 'Passed' : 'Failed'}
                        </Badge>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          Attempt #{attempt.attemptNumber} • {attempt.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                        {attempt.quizTitle}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {attempt.courseTitle ? `${attempt.courseTitle} — ` : ''}{attempt.lessonTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 self-end md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right">
                        <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                          {attempt.percentageScore}%
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Score: {attempt.score} pts
                        </p>
                      </div>
                      {attempt.courseId && (
                        <Link href={`/dashboard/courses/${attempt.courseId}`}>
                          <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                            View Course
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div>
          {assignmentSubmissions.length === 0 ? (
            <EmptyState
              title="No Assignment Submissions Found"
              description="You have not submitted any assignments yet."
              action={
                <Link href="/dashboard/courses">
                  <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View Enrolled Courses
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {assignmentSubmissions.map((sub) => {
                const statusBadgeVariant =
                  sub.status === 'graded'
                    ? sub.isPassed
                      ? 'success'
                      : 'destructive'
                    : 'warning';

                return (
                  <Card key={sub.id} className="border-slate-200 dark:border-slate-800">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusBadgeVariant} className="text-xs">
                            {sub.status === 'graded'
                              ? sub.isPassed
                                ? 'Passed'
                                : 'Needs Revision'
                              : 'Pending Grading'}
                          </Badge>
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            Submission #{sub.submissionNumber} • {new Date(sub.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                          {sub.assignmentTitle || sub.originalFileName}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {sub.courseTitle ? `${sub.courseTitle} — ` : ''}{sub.lessonTitle}
                        </p>
                        {sub.feedbackMarkdown && (
                          <div className="mt-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-2.5 rounded-md border border-amber-200 dark:border-amber-900/50">
                            <strong>Feedback:</strong> {sub.feedbackMarkdown}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 self-end md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                        <div className="text-right">
                          <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                            {sub.percentageScore !== null && sub.percentageScore !== undefined
                              ? `${sub.percentageScore}%`
                              : '--'}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {sub.mimeType.split('/')[1]?.toUpperCase() || 'FILE'} • {(sub.fileSizeBytes / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        {sub.courseId && (
                          <Link href={`/dashboard/courses/${sub.courseId}`}>
                            <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                              View Course
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
