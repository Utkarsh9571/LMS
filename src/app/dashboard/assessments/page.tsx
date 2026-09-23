import React from 'react';
import { getSessionFromCookies } from '@/lib/session';
import { connectToDatabase } from '@/lib/db';
import { QuizAttemptModel } from '@/core/domain/quiz-attempt.model';
import { AssignmentSubmissionModel } from '@/core/domain/assignment-submission.model';
import { QuizModel } from '@/core/domain/quiz.model';
import { AssignmentModel } from '@/core/domain/assignment.model';
import { LessonModel } from '@/core/domain/lesson.model';
import { CourseModel } from '@/core/domain/course.model';
import { StudentAssessmentsClient } from './assessments-client';

export const revalidate = 0;

export default async function StudentAssessmentsPage() {
  const session = await getSessionFromCookies();
  if (!session) return null;

  await connectToDatabase();

  const quizAttemptsDocs = await QuizAttemptModel.find({ userId: session.userId }).sort({ updatedAt: -1 });
  const assignmentSubmissionsDocs = await AssignmentSubmissionModel.find({ userId: session.userId }).sort({ submittedAt: -1 });

  const quizIds = quizAttemptsDocs.map((q) => q.quizId);
  const quizzes = await QuizModel.find({ _id: { $in: quizIds } });
  const quizMap = new Map(quizzes.map((q) => [q._id.toString(), q]));

  const assignmentIds = assignmentSubmissionsDocs.map((a) => a.assignmentId);
  const assignments = await AssignmentModel.find({ _id: { $in: assignmentIds } });
  const assignmentMap = new Map(assignments.map((a) => [a._id.toString(), a]));

  const lessonIds = [
    ...quizAttemptsDocs.map((q) => q.lessonId),
    ...assignmentSubmissionsDocs.map((a) => a.lessonId)
  ];
  const lessons = await LessonModel.find({ _id: { $in: lessonIds } });
  const lessonMap = new Map(lessons.map((l) => [l._id.toString(), l]));

  const courseIds = lessons.map((l) => l.courseId);
  const courses = await CourseModel.find({ _id: { $in: courseIds } });
  const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));

  const quizAttempts = quizAttemptsDocs.map((attempt) => {
    const quiz = quizMap.get(attempt.quizId.toString());
    const lesson = lessonMap.get(attempt.lessonId.toString());
    const course = lesson ? courseMap.get(lesson.courseId.toString()) : null;

    return {
      id: attempt._id.toString(),
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      isPassed: attempt.isPassed,
      percentageScore: attempt.percentageScore,
      score: attempt.score,
      quizTitle: quiz?.title || lesson?.title || 'Quiz Attempt',
      lessonTitle: lesson?.title || '',
      courseTitle: course?.title || '',
      courseId: course ? course._id.toString() : ''
    };
  });

  const assignmentSubmissions = assignmentSubmissionsDocs.map((sub) => {
    const assignment = assignmentMap.get(sub.assignmentId.toString());
    const lesson = lessonMap.get(sub.lessonId.toString());
    const course = lesson ? courseMap.get(lesson.courseId.toString()) : null;

    return {
      id: sub._id.toString(),
      submissionNumber: sub.submissionNumber,
      status: sub.status,
      isPassed: sub.isPassed ?? null,
      submittedAt: sub.submittedAt.toISOString(),
      percentageScore: sub.percentageScore ?? null,
      originalFileName: sub.originalFileName,
      mimeType: sub.mimeType,
      fileSizeBytes: sub.fileSizeBytes,
      assignmentTitle: assignment?.title || sub.originalFileName,
      lessonTitle: lesson?.title || '',
      courseTitle: course?.title || '',
      courseId: course ? course._id.toString() : '',
      feedbackMarkdown: sub.feedbackMarkdown ?? null
    };
  });

  return (
    <StudentAssessmentsClient
      quizAttempts={quizAttempts}
      assignmentSubmissions={assignmentSubmissions}
    />
  );
}
